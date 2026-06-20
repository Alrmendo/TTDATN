import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';

import {
  getPromotions,
  createPromotion,
  deactivatePromotion,
} from '../controllers/promotion.controller';

const router = Router();

router.get('/', authMiddleware, getPromotions);

router.post('/', authMiddleware, createPromotion);

router.put('/:id', authMiddleware, deactivatePromotion);

export default router;