import { Request, Response } from 'express';
import ReportService from '../services/report.service';

/**
 * GET /api/report/revenue?startDate=&endDate=&storeId=
 * Validate: startDate <= endDate, ngược lại trả "Khoảng thời gian không hợp lệ"
 */
export const getRevenueReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, storeId } = req.query;

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
