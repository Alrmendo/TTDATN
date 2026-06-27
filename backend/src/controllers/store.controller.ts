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

export const createStore = async (req: Request, res: Response): Promise<void> => {
  try {
    const { storeName, address, phone } = req.body;
    if (!storeName || !address) {
      res.status(400).json({ message: 'storeName và address là bắt buộc' });
      return;
    }
    const store = await Store.create({ storeName, address, phone: phone ?? null, isActive: true });
    res.status(201).json(store);
    return;
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

export const updateStore = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { storeName, address, phone } = req.body;
    const store = await Store.findByPk(id);
    if (!store) {
      res.status(404).json({ message: 'Không tìm thấy chi nhánh' });
      return;
    }
    if (storeName !== undefined) store.storeName = storeName;
    if (address !== undefined) store.address = address;
    if (phone !== undefined) store.phone = phone;
    await store.save();
    res.status(200).json(store);
    return;
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

export const deactivateStore = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const store = await Store.findByPk(id);
    if (!store) {
      res.status(404).json({ message: 'Không tìm thấy chi nhánh' });
      return;
    }
    store.isActive = false;
    await store.save();
    res.status(200).json({ message: 'Đã vô hiệu hóa chi nhánh' });
    return;
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};
