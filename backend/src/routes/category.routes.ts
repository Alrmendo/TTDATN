import { Router } from 'express';
import { getCategories } from '../controllers/category.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get(
  '/',
  authMiddleware,
  getCategories
);

export default router;