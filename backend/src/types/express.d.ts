declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: 'Manager' | 'Staff' | 'WarehouseStaff';
        storeId: string | null;
      };
    }
  }
}

export {};
