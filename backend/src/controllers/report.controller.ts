import { Request, Response } from 'express';
import ReportService from '../services/report.service';

/**
 * GET /api/report/revenue?startDate=&endDate=&storeId=
 * GET /api/report/revenue?mode=month&month=&year=&storeId=
 * GET /api/report/revenue?mode=quarter&quarter=&year=&storeId=
 * GET /api/report/revenue?mode=year&year=&storeId=
 * Validate: startDate <= endDate, ngược lại trả "Khoảng thời gian không hợp lệ"
 * Không truyền `mode` (hoặc mode=custom) giữ nguyên hành vi cũ theo startDate/endDate.
 */
export const getRevenueReport = async (req: Request, res: Response) => {
  try {
    const { mode, startDate, endDate, storeId, month, year, quarter } = req.query;
    const sId = storeId as string | undefined;

    if (mode === 'month') {
      const m = parseInt(month as string, 10);
      const y = parseInt(year as string, 10);
      if (!m || !y || m < 1 || m > 12) {
        return res.status(400).json({ message: 'month và year không hợp lệ' });
      }
      const result = await ReportService.getMonthRevenue(m, y, sId);
      return res.json(result);
    }

    if (mode === 'quarter') {
      const q = parseInt(quarter as string, 10);
      const y = parseInt(year as string, 10);
      if (!q || !y || q < 1 || q > 4) {
        return res.status(400).json({ message: 'quarter và year không hợp lệ' });
      }
      const result = await ReportService.getQuarterRevenue(q, y, sId);
      return res.json(result);
    }

    if (mode === 'year') {
      const y = parseInt(year as string, 10);
      if (!y) {
        return res.status(400).json({ message: 'year không hợp lệ' });
      }
      const result = await ReportService.getYearRevenue(y, sId);
      return res.json(result);
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate và endDate là bắt buộc' });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return res.status(400).json({ message: 'Khoảng thời gian không hợp lệ' });
    }

    // Bao gồm toàn bộ ngày kết thúc (đến 23:59:59.999)
    end.setHours(23, 59, 59, 999);

    const report = await ReportService.getRevenueReport(start, end, storeId as string | undefined);
    return res.json(report);
  } catch (err) {
    return res.status(500).json({ message: 'Lỗi server', error: (err as Error).message });
  }
};

/**
 * GET /api/report/inventory?storeId=
 */
export const getInventoryReport = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.query;
    const report = await ReportService.getInventoryReport(storeId as string | undefined);
    return res.json(report);
  } catch (err) {
    return res.status(500).json({ message: 'Lỗi server', error: (err as Error).message });
  }
};
