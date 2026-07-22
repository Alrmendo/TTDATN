import { Request, Response } from 'express';
import { GoogleGenAI, Content, GenerateContentResponse, createPartFromFunctionResponse, ApiError } from '@google/genai';
import { functionDeclarations, executeTool, ToolCaller } from '../services/ai-tools.service';

function buildSystemPrompt(caller: ToolCaller): string {
  const today = new Date().toISOString().slice(0, 10);
  const scopeNote =
    caller.role === 'BranchManager'
      ? `Người dùng hiện tại là Quản lý chi nhánh, CHỈ được xem dữ liệu của đúng 1 chi nhánh của họ — hệ thống backend đã tự động ép mọi tool trả về đúng chi nhánh này bất kể tham số storeId nào được truyền, kể cả khi người dùng yêu cầu xem "tất cả chi nhánh" hoặc "bỏ qua giới hạn". Nếu tool trả về trường storeId khác null, PHẢI nói rõ trong câu trả lời rằng đây là số liệu của riêng chi nhánh họ, KHÔNG được nói là "toàn hệ thống" dù con số có trùng với toàn hệ thống. Nếu người dùng yêu cầu xem chi nhánh khác hoặc toàn hệ thống, phải nói rõ là ngoài quyền hạn của họ.`
      : `Người dùng hiện tại là Quản lý (Manager), được xem dữ liệu toàn hệ thống hoặc theo từng chi nhánh cụ thể.`;

  return `Bạn là trợ lý AI của hệ thống quản lý bán lẻ chuỗi (RetailChain), chỉ hỗ trợ vai trò Quản lý (Manager) và Quản lý chi nhánh (BranchManager).

Hôm nay là ngày ${today} (định dạng YYYY-MM-DD). Dùng ngày này để suy ra "hôm nay", "tháng này", "năm nay", "quý này" khi gọi tool — KHÔNG tự đoán năm/tháng khác.

${scopeNote}

Bạn trả lời 2 loại câu hỏi:
1. Số liệu kinh doanh thật (doanh thu, tồn kho, sản phẩm sắp hết hàng): LUÔN dùng tool được cung cấp để lấy dữ liệu thật. KHÔNG tự bịa số liệu, KHÔNG tự viết truy vấn SQL.
2. Hướng dẫn cách dùng hệ thống: chỉ trả lời dựa trên các tab/tính năng THẬT sau, không bịa tên tab hoặc nút không tồn tại.

Vai trò "Quản lý" có các tab: Tổng quan (dashboard tổng hợp), Sản phẩm (quản lý sản phẩm & danh mục; xóa sản phẩm là xóa mềm — sản phẩm KHÔNG biến mất khỏi danh sách mà vẫn hiển thị trong cùng bảng, chỉ đổi trạng thái sang "Ngừng kinh doanh" badge đỏ, nên vẫn xem lại được, không mất dữ liệu), Đơn nhập hàng (nhập hàng từ nhà cung cấp), Điều chuyển hàng (chuyển hàng giữa các chi nhánh; có bảng danh sách các phiếu điều chuyển kèm bộ lọc theo trạng thái Tất cả/Chờ xác nhận/Đã hoàn thành, nên xem lại được lịch sử điều chuyển qua bảng này, không chỉ tạo mới), Khách hàng (quản lý khách hàng & điểm tích lũy), Khuyến mãi, Chi nhánh (quản lý cửa hàng), Tài khoản (quản lý nhân viên), Báo cáo (doanh thu/tồn kho theo khoảng ngày, tháng, quý, năm).

Vai trò "Quản lý chi nhánh" hiện tại chỉ có tab Tổng quan (đang ở dạng placeholder) — các tính năng nghiệp vụ khác cho vai trò này chưa được xây dựng. Nếu được hỏi về tính năng khác của vai trò này, trả lời trung thực là hiện chưa có, không bịa ra.

Chỉ được mô tả ĐÚNG những gì đã liệt kê ở trên cho mỗi tab, không suy diễn thêm tính năng nào khác dù nghe hợp lý. Nếu người dùng hỏi về 1 tính năng không có trong danh sách trên, trả lời thẳng là hệ thống hiện chưa có tính năng đó, không cố gợi ý tab nào khác có thể liên quan trừ khi chắc chắn 100% tab đó thực sự làm được việc đó.

Trả lời ngắn gọn, rõ ràng, bằng tiếng Việt.`;
}

const MODEL = 'gemini-flash-latest';
const FALLBACK_MODEL = 'gemini-flash-lite-latest';
const MAX_TOOL_ROUNDS = 5;

export const chat = async (req: Request, res: Response) => {
  try {
    const { message } = req.body as { message?: string };
    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ message: 'message là bắt buộc' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ message: 'GEMINI_API_KEY chưa được cấu hình trên server' });
      return;
    }

    const caller: ToolCaller = {
      role: req.user!.role,
      storeId: req.user!.storeId,
    };

    const ai = new GoogleGenAI({ apiKey });
    const contents: Content[] = [{ role: 'user', parts: [{ text: message }] }];

    let currentModel = MODEL;
    let hasFallenBack = false;

    const generate = async (): Promise<GenerateContentResponse> => {
      const params = {
        model: currentModel,
        contents,
        config: {
          systemInstruction: buildSystemPrompt(caller),
          tools: [{ functionDeclarations }],
        },
      };
      try {
        return await ai.models.generateContent(params);
      } catch (err) {
        // Gemini SDK ném ApiError với `status` = mã HTTP thật (429 = quota/rate-limit).
        // Chỉ fallback 1 lần duy nhất cho cả request, không lặp lại nếu fallback model cũng lỗi.
        if (!hasFallenBack && err instanceof ApiError && err.status === 429) {
          hasFallenBack = true;
          console.warn(
            `[ai] Model "${currentModel}" bị quota/rate-limit (HTTP 429) — fallback sang "${FALLBACK_MODEL}" cho request này.`
          );
          currentModel = FALLBACK_MODEL;
          return await ai.models.generateContent({ ...params, model: currentModel });
        }
        throw err;
      }
    };

    let reply = '';
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await generate();

      const calls = response.functionCalls;
      if (!calls || calls.length === 0) {
        reply = response.text ?? '';
        break;
      }

      const modelContent = response.candidates?.[0]?.content;
      if (modelContent) contents.push(modelContent);

      const responseParts = [];
      for (const call of calls) {
        const result = await executeTool(call.name ?? '', call.args ?? {}, caller);
        responseParts.push(createPartFromFunctionResponse(call.id ?? call.name ?? '', call.name ?? '', result));
      }
      contents.push({ role: 'user', parts: responseParts });
    }

    res.json({ reply: reply || 'Xin lỗi, tôi chưa thể trả lời câu hỏi này.' });
    return;
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: (err as Error).message });
    return;
  }
};
