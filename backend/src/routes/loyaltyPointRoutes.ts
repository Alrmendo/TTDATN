import { Router } from 'express';
import { getBalance, redeemPoints } from '../controllers/loyaltyPoint.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/balance', authMiddleware, getBalance);
router.post('/redeem', authMiddleware, redeemPoints);

export default router;
