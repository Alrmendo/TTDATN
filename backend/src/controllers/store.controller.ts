import { Request, Response } from 'express';
import { Store } from '../models';

export const listStores = async (req: Request, res: Response): Promise<void> => {
  try {
    const stores = await Store.findAll({
      where: { isActive: true },
      attributes: ['id', 'storeName', 'address', 'phone'],
      order: [['storeName', 'ASC']],
    });
    res.status(200).json(stores);
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};
