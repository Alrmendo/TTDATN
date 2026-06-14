import { Router } from 'express';
import { listStores } from '../controllers/store.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, listStores);

export default router;
