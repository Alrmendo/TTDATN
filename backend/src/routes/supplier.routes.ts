import { Router } from 'express';

import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';

import {
  getSuppliers,
  createSupplier,
} from '../controllers/supplier.controller';

const router = Router();

router.get(
  '/',
  authMiddleware,
  getSuppliers
);

router.post(
  '/',
  authMiddleware,
  roleMiddleware(['Manager']),
  createSupplier
);

export default router;