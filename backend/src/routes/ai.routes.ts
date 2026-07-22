import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { chat } from '../controllers/ai.controller';

const router = Router();

// POST /api/ai/chat — body { message }, chỉ Manager + BranchManager
router.post('/chat', authMiddleware, roleMiddleware(['Manager', 'BranchManager']), chat);

export default router;
