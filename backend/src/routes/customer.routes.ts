import { Router } from 'express';
import { searchCustomers, createCustomer } from '../controllers/customer.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

const router = Router();

router.get('/', authMiddleware, roleMiddleware(['Staff', 'Manager']), searchCustomers);
router.post('/', authMiddleware, roleMiddleware(['Staff', 'Manager']), createCustomer);

export default router;
