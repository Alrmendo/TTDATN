import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { getRevenueReport, getInventoryReport } from '../controllers/report.controller';

const router = Router();

// GET /api/report/revenue?startDate=&endDate=&storeId=
router.get('/revenue', authMiddleware, roleMiddleware(['Manager']), getRevenueReport);

// GET /api/report/inventory?storeId=
router.get('/inventory', authMiddleware, roleMiddleware(['Manager']), getInventoryReport);

export default router;
