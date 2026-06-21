// backend/src/routes/reportRoutes.ts
//
// Mount tại /api/reports (xem app.ts / server.ts chính của dự án).
//
// Phân quyền: báo cáo doanh thu/tồn kho chỉ dành cho Manager xem
// (Dashboard Manager, màn hình "Báo cáo doanh thu"). Nếu WarehouseStaff
// cũng cần xem báo cáo tồn kho riêng, thêm role vào roleMiddleware bên dưới.

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { getRevenueReport, getInventoryReport } from '../controllers/reportController';

const router = Router();

router.get('/revenue', authMiddleware, roleMiddleware(['Manager']), getRevenueReport);
router.get('/inventory', authMiddleware, roleMiddleware(['Manager']), getInventoryReport);

export default router;
