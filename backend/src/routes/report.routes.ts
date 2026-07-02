import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { getRevenueReport, getInventoryReport } from '../controllers/report.controller';

const router = Router();

// GET /api/reports/revenue?startDate=&endDate=&storeId=
router.get('/revenue', authMiddleware, roleMiddleware(['Manager']), getRevenueReport);

// GET /api/reports/inventory?storeId=
router.get('/inventory', authMiddleware, roleMiddleware(['Manager']), getInventoryReport);

export default router;
