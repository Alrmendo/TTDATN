import type { FunctionDeclaration } from '@google/genai';
import ReportService from './report.service';
import InventoryService from './Inventory.service';

// 3 tool khai báo cho Gemini function-calling — KHÔNG viết logic query mới,
// executeTool() dưới đây chỉ gọi lại đúng ReportService/InventoryService thật
// đang được dùng ở report.controller.ts / inventory.controller.ts.
export const functionDeclarations: FunctionDeclaration[] = [
  {
    name: 'get_revenue_report',
    description:
      'Lấy báo cáo doanh thu thật của hệ thống bán lẻ. mode="range" dùng startDate/endDate (YYYY-MM-DD); mode="month" dùng month+year; mode="quarter" dùng quarter+year; mode="year" dùng year. storeId tùy chọn (bỏ trống = toàn hệ thống, chỉ Manager mới được bỏ trống).',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['range', 'month', 'quarter', 'year'] },
        startDate: { type: 'string', description: 'YYYY-MM-DD, dùng khi mode=range' },
        endDate: { type: 'string', description: 'YYYY-MM-DD, dùng khi mode=range' },
        month: { type: 'integer', description: '1-12, dùng khi mode=month' },
        quarter: { type: 'integer', description: '1-4, dùng khi mode=quarter' },
        year: { type: 'integer', description: 'dùng khi mode=month|quarter|year' },
        storeId: { type: 'string', description: 'UUID chi nhánh; bỏ trống = toàn hệ thống (chỉ Manager)' },
      },
      required: ['mode'],
    },
  },
  {
    name: 'get_low_stock_products',
    description: 'Lấy danh sách sản phẩm sắp hết hàng (tồn kho dưới ngưỡng cảnh báo).',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        storeId: { type: 'string', description: 'UUID chi nhánh; bỏ trống = quét toàn hệ thống (chỉ Manager)' },
      },
    },
  },
  {
    name: 'get_inventory_by_store',
    description: 'Lấy báo cáo tồn kho chi tiết theo sản phẩm (số lượng, giá trị tồn kho) của 1 chi nhánh, hoặc toàn hệ thống nếu bỏ trống storeId.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        storeId: { type: 'string', description: 'UUID chi nhánh; bỏ trống = toàn hệ thống (chỉ Manager)' },
      },
    },
  },
];

export interface ToolCaller {
  role: 'Manager' | 'Staff' | 'WarehouseStaff' | 'BranchManager';
  storeId: string | null;
}

// BranchManager LUÔN bị ép về đúng storeId của chính họ (từ JWT), bỏ qua
// bất kỳ storeId AI truyền vào. Manager được truyền storeId tùy ý hoặc để trống.
function resolveStoreId(caller: ToolCaller, requested: unknown): string | undefined {
  if (caller.role === 'BranchManager') {
    if (!caller.storeId) {
      throw new Error('Tài khoản Quản lý chi nhánh này chưa được gán chi nhánh nào');
    }
    return caller.storeId;
  }
  return typeof requested === 'string' && requested.trim() ? requested.trim() : undefined;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  caller: ToolCaller
): Promise<Record<string, unknown>> {
  try {
    switch (name) {
      case 'get_revenue_report': {
        const storeId = resolveStoreId(caller, args.storeId);
        const mode = (args.mode as string) || 'range';

        if (mode === 'month') {
          const month = parseInt(String(args.month), 10);
          const year = parseInt(String(args.year), 10);
          if (!month || !year) return { error: 'Thiếu hoặc sai month/year' };
          return await ReportService.getMonthRevenue(month, year, storeId);
        }

        if (mode === 'quarter') {
          const quarter = parseInt(String(args.quarter), 10);
          const year = parseInt(String(args.year), 10);
          if (!quarter || !year) return { error: 'Thiếu hoặc sai quarter/year' };
          return await ReportService.getQuarterRevenue(quarter, year, storeId);
        }

        if (mode === 'year') {
          const year = parseInt(String(args.year), 10);
          if (!year) return { error: 'Thiếu hoặc sai year' };
          return await ReportService.getYearRevenue(year, storeId);
        }

        const startDate = args.startDate as string | undefined;
        const endDate = args.endDate as string | undefined;
        if (!startDate || !endDate) return { error: 'Thiếu startDate/endDate' };
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
          return { error: 'Khoảng thời gian không hợp lệ' };
        }
        end.setHours(23, 59, 59, 999);
        return await ReportService.getRevenueReport(start, end, storeId);
      }

      case 'get_low_stock_products': {
        const storeId = resolveStoreId(caller, args.storeId);
        const items = await InventoryService.checkLowStock(storeId);
        return { items };
      }

      case 'get_inventory_by_store': {
        const storeId = resolveStoreId(caller, args.storeId);
        return await ReportService.getInventoryReport(storeId);
      }

      default:
        return { error: `Không có tool tên "${name}"` };
    }
  } catch (err) {
    return { error: (err as Error).message };
  }
}
