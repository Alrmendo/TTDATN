// backend/src/routes/stock-transfer.routes.ts

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import {
  getTransfers,
  createTransfer,
  confirmTransfer,
} from '../controllers/stock-transfer.controller';

const router = Router();

// Tất cả route yêu cầu đăng nhập
router.use(authMiddleware);

// GET /api/stock-transfers — mọi role đã login
router.get('/', getTransfers);

// POST /api/stock-transfers — Manager only
router.post('/', roleMiddleware(['Manager']), createTransfer);

// PUT /api/stock-transfers/:id/confirm — WarehouseStaff only
router.put('/:id/confirm', roleMiddleware(['WarehouseStaff']), confirmTransfer);

export default router;
