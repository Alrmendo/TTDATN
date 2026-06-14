import { Router } from 'express';
import { listAccounts, createAccount, updateAccount } from '../controllers/account.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

router.get('/', authMiddleware, roleMiddleware(['Manager']), listAccounts);
router.post('/', authMiddleware, roleMiddleware(['Manager']), createAccount);
router.put('/:id', authMiddleware, roleMiddleware(['Manager']), updateAccount);

export default router;
