import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  userId: string;
  role: 'Manager' | 'Staff' | 'WarehouseStaff';
  storeId: string | null;
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      storeId: decoded.storeId,
    };
    next();
  } catch {
    res.status(401).json({ message: 'Unauthorized' });
  }
};
