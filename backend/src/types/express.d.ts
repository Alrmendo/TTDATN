declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: 'Manager' | 'Staff' | 'WarehouseStaff' | 'BranchManager';
        storeId: string | null;
      };
    }
  }
}

export {};
