import { Router } from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct, searchProducts } from '../controllers/product.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

router.get('/search', authMiddleware, searchProducts);

router.get('/', authMiddleware, getProducts);

router.post('/', authMiddleware, roleMiddleware(['Manager']), createProduct);

router.put('/:id', authMiddleware, roleMiddleware(['Manager']), updateProduct);

router.delete('/:id', authMiddleware, roleMiddleware(['Manager']), deleteProduct);

export default router;
