import { Router } from 'express';
import { searchProducts } from '../controllers/product.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/search', authMiddleware, searchProducts);

export default router;
