// backend/src/routes/inventoryRoutes.ts
//
// Mount tại /api/inventory (xem app.ts / server.ts chính của dự án).
//
// Phân quyền theo Schema.md:
// - Xem tồn kho: bất kỳ ai đã đăng nhập (Manager, Staff, WarehouseStaff)
//   cần xem để bán hàng / quản lý.
// - Cập nhật tồn kho trực tiếp qua UI Quản lý kho: chỉ WarehouseStaff.

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import {
  getInventoryByStore,
  getLowStockProducts,
  updateInventory,
} from '../controllers/inventoryController';

const router = Router();

// Thứ tự quan trọng: /low-stock phải đứng TRƯỚC route gốc '/'
// để tránh xung đột nếu sau này có thêm route dạng '/:id'.
router.get('/low-stock', authMiddleware, getLowStockProducts);

router.get('/', authMiddleware, getInventoryByStore);

router.patch('/', authMiddleware, roleMiddleware(['WarehouseStaff']), updateInventory);

export default router;
