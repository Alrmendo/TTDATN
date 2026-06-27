import { Router } from 'express';
import { listStores, createStore, updateStore, deactivateStore } from '../controllers/store.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

router.get('/', authMiddleware, listStores);

router.post('/', authMiddleware, roleMiddleware(['Manager']), createStore);

router.put('/:id', authMiddleware, roleMiddleware(['Manager']), updateStore);

router.put('/:id/deactivate', authMiddleware, roleMiddleware(['Manager']), deactivateStore);

export default router;
