import { Request, Response, NextFunction, RequestHandler } from 'express';

export const roleMiddleware = (allowedRoles: string[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: 'Bạn không có quyền truy cập' });
      return;
    }
    next();
  };
};
