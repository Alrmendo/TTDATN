import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

import {
  getPromotions,
  createPromotion,
  deactivatePromotion,
  updatePromotion,
} from '../controllers/promotion.controller';

const router = Router();

router.get('/', authMiddleware, getPromotions);

router.post('/', authMiddleware, roleMiddleware(['Manager']), createPromotion);

router.put('/:id', authMiddleware, roleMiddleware(['Manager']), updatePromotion);

router.delete('/:id', authMiddleware, roleMiddleware(['Manager']), deactivatePromotion);

export default router;