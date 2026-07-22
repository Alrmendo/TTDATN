// backend/src/routes/purchase-order.routes.ts

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrderById,
  confirmReceipt,
  cancelPurchaseOrder,
} from '../controllers/purchase-order.controller';
import {
  getPurchaseOrderPaymentSummary,
  recordPurchaseOrderPayment,
} from '../controllers/purchase-order-payment.controller';

const router = Router();

// Tất cả route yêu cầu đăng nhập
router.use(authMiddleware);

// GET /api/purchase-orders — Manager + WarehouseStaff
router.get(
  '/',
  roleMiddleware(['Manager', 'WarehouseStaff']),
  getPurchaseOrders
);

// GET /api/purchase-orders/:id — Manager + WarehouseStaff
router.get(
  '/:id',
  roleMiddleware(['Manager', 'WarehouseStaff']),
  getPurchaseOrderById
);

// POST /api/purchase-orders — Manager only
router.post(
  '/',
  roleMiddleware(['Manager']),
  createPurchaseOrder
);

// GET /api/purchase-orders/:id/payments — xem lịch sử và công nợ
router.get(
  '/:id/payments',
  roleMiddleware(['Manager', 'WarehouseStaff']),
  getPurchaseOrderPaymentSummary
);

// POST /api/purchase-orders/:id/payments — Manager ghi nhận 1 lần thanh toán
router.post(
  '/:id/payments',
  roleMiddleware(['Manager']),
  recordPurchaseOrderPayment
);

// PUT /api/purchase-orders/:id/confirm — WarehouseStaff only
router.put(
  '/:id/confirm',
  roleMiddleware(['WarehouseStaff']),
  confirmReceipt
);

// PUT /api/purchase-orders/:id/cancel — Manager only
router.put(
  '/:id/cancel',
  roleMiddleware(['Manager']),
  cancelPurchaseOrder
);

export default router;