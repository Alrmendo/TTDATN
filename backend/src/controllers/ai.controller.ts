import { Request, Response } from 'express';
import { GoogleGenAI, Content, createPartFromFunctionResponse } from '@google/genai';
import { functionDeclarations, executeTool, ToolCaller } from '../services/ai-tools.service';

const SYSTEM_PROMPT = `Bạn là trợ lý AI của hệ thống quản lý bán lẻ chuỗi (RetailChain), chỉ hỗ trợ vai trò Quản lý (Manager) và Quản lý chi nhánh (BranchManager).

Bạn trả lời 2 loại câu hỏi:
1. Số liệu kinh doanh thật (doanh thu, tồn kho, sản phẩm sắp hết hàng): LUÔN dùng tool được cung cấp để lấy dữ liệu thật. KHÔNG tự bịa số liệu, KHÔNG tự viết truy vấn SQL.
2. Hướng dẫn cách dùng hệ thống: chỉ trả lời dựa trên các tab/tính năng THẬT sau, không bịa tên tab hoặc nút không tồn tại.

Vai trò "Quản lý" có các tab: Tổng quan (dashboard tổng hợp), Sản phẩm (quản lý sản phẩm & danh mục), Đơn nhập hàng (nhập hàng từ nhà cung cấp), Điều chuyển hàng (chuyển hàng giữa các chi nhánh), Khách hàng (quản lý khách hàng & điểm tích lũy), Khuyến mãi, Chi nhánh (quản lý cửa hàng), Tài khoản (quản lý nhân viên), Báo cáo (doanh thu/tồn kho theo khoảng ngày, tháng, quý, năm).

Vai trò "Quản lý chi nhánh" hiện tại chỉ có tab Tổng quan (đang ở dạng placeholder) — các tính năng nghiệp vụ khác cho vai trò này chưa được xây dựng. Nếu được hỏi về tính năng khác của vai trò này, trả lời trung thực là hiện chưa có, không bịa ra.

Trả lời ngắn gọn, rõ ràng, bằng tiếng Việt.`;

const MODEL = 'gemini-2.5-flash';
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

    let reply = '';
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ functionDeclarations }],
        },
      });

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
