// backend/src/controllers/stock-transfer.controller.ts

import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { StockTransfer } from '../models/stock-transfer.model';
import { Store } from '../models/store.model';
import { Product } from '../models/product.model';
import { User } from '../models/user.model';
import { StockTransferService, StockTransferServiceError } from '../services/StockTransferService';

// GET /api/stock-transfers
// Mọi role đã login đều xem được. Filter tùy chọn: status, storeId (fromStoreId HOẶC toStoreId)
export const getTransfers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, storeId } = req.query;

    const where = {
      ...(status ? { status } : {}),
      ...(storeId ? { [Op.or]: [{ fromStoreId: storeId }, { toStoreId: storeId }] } : {}),
    };

    const transfers = await StockTransfer.findAll({
      where,
      include: [
        { model: Store, as: 'fromStore', attributes: ['id', 'storeName'] },
        { model: Store, as: 'toStore', attributes: ['id', 'storeName'] },
        { model: Product, as: 'product', attributes: ['id', 'productName', 'sku'] },
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(transfers);
    return;
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
    return;
  }
};

// POST /api/stock-transfers — Manager only
export const createTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fromStoreId, toStoreId, productId, quantity } = req.body;
    const createdBy = req.user!.userId;

    const transfer = await StockTransferService.createTransfer({
      fromStoreId,
      toStoreId,
      productId,
      quantity,
      createdBy,
    });

    res.status(201).json(transfer);
    return;
  } catch (err) {
    if (err instanceof StockTransferServiceError) {
      res.status(err.statusCode).json({ message: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
    return;
  }
};

// PUT /api/stock-transfers/:id/confirm — WarehouseStaff only
export const confirmTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const transferId = req.params.id as string;
    const confirmedBy = req.user!.userId;

    const transfer = await StockTransferService.confirmTransfer(transferId, confirmedBy);

    res.json(transfer);
    return;
  } catch (err) {
    if (err instanceof StockTransferServiceError) {
      res.status(err.statusCode).json({ message: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
    return;
  }
};
