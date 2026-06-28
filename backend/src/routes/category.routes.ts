import { Router } from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/category.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

router.get(
  '/',
  authMiddleware,
  getCategories
);

router.post(
  '/',
  authMiddleware,
  roleMiddleware(['Manager']),
  createCategory
);

router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['Manager']),
  updateCategory
);

router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['Manager']),
  deleteCategory
);

export default router;