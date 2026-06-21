// backend/src/controllers/reportController.ts

import { Request, Response } from 'express';
import { ReportService, DateRangeError } from '../services/ReportService';

/**
 * GET /api/reports/revenue?startDate=&endDate=&storeId=
 */
export async function getRevenueReport(req: Request, res: Response) {
  try {
    const { startDate, endDate, storeId } = req.query;

    const report = await ReportService.getRevenueReport(
      startDate,
      endDate,
      typeof storeId === 'string' ? storeId : undefined
    );

    return res.json({ data: report });
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * GET /api/reports/inventory?storeId=
 */
export async function getInventoryReport(req: Request, res: Response) {
  try {
    const { storeId } = req.query;

    const report = await ReportService.getInventoryReport(
      typeof storeId === 'string' ? storeId : undefined
    );

    return res.json({ data: report });
  } catch (err) {
    return handleError(res, err);
  }
}

function handleError(res: Response, err: unknown) {
  if (err instanceof DateRangeError) {
    return res.status(400).json({ message: err.message });
  }
  console.error('[ReportController]', err);
  return res.status(500).json({ message: 'Lỗi hệ thống' });
}
