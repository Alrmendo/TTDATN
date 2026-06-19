import { Router } from 'express';
import {
  createOrder,
  addItem,
  removeItem,
  applyPromotion,
  confirmPayment,
  getInvoices,
} from '../controllers/order.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

router.post('/', authMiddleware, roleMiddleware(['Staff']), createOrder);
router.post('/:id/items', authMiddleware, roleMiddleware(['Staff']), addItem);
router.delete('/:id/items/:productId', authMiddleware, roleMiddleware(['Staff']), removeItem);
router.post('/:id/promotion', authMiddleware, roleMiddleware(['Staff']), applyPromotion);
router.post('/:id/confirm-payment', authMiddleware, roleMiddleware(['Staff']), confirmPayment);
router.get('/', authMiddleware, roleMiddleware(['Staff', 'Manager']), getInvoices);

export default router;
