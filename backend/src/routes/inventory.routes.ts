import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import {
  getInventoryByStore,
  getLowStockProducts,
  setInventoryQuantity,
} from '../controllers/inventory.controller';

const router = Router();

// GET /api/inventory/low-stock?storeId=  — sản phẩm sắp hết, dùng cho dashboard
router.get('/low-stock', authMiddleware, roleMiddleware(['Manager', 'WarehouseStaff']), getLowStockProducts);

// GET /api/inventory?storeId=  — xem tồn kho theo chi nhánh
router.get('/', authMiddleware, roleMiddleware(['Manager', 'WarehouseStaff']), getInventoryByStore);

// PUT /api/inventory/:productId  — body { storeId, quantity } — điều chỉnh tồn kho thực tế
router.put('/:productId', authMiddleware, roleMiddleware(['Manager', 'WarehouseStaff']), setInventoryQuantity);

export default router;
