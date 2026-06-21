// backend/src/controllers/purchase-order.controller.ts

import { Request, Response } from 'express';
import { PurchaseOrderService, PurchaseOrderServiceError } from '../services/PurchaseOrderService';

// POST /api/purchase-orders
// Manager tạo đơn nhập hàng
export const createPurchaseOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { supplierId, storeId, items } = req.body;
    const createdBy = req.user!.userId;

    if (!supplierId || !storeId || !items) {
      res.status(400).json({ message: 'Thiếu supplierId, storeId hoặc items' });
      return;
    }

    const order = await PurchaseOrderService.createPurchaseOrder({
      supplierId,
      storeId,
      createdBy,
      items,
    });

    res.status(201).json(order);
    return;
  } catch (err) {
    if (err instanceof PurchaseOrderServiceError) {
      res.status(err.statusCode).json({ message: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
    return;
  }
};

// GET /api/purchase-orders
// Manager: xem tất cả; WarehouseStaff: chỉ xem store của mình
export const getPurchaseOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, storeId: userStoreId } = req.user!;
    const { status, search, startDate, endDate } = req.query;

    // WarehouseStaff bị giới hạn về store của mình
    let storeId: string | undefined;
    if (role === 'WarehouseStaff') {
      storeId = userStoreId ?? undefined;
    } else {
      // Manager có thể filter theo storeId tuỳ ý
      storeId = req.query.storeId as string | undefined;
    }

    const orders = await PurchaseOrderService.getPurchaseOrders({
      storeId,
      status: status as string | undefined,
      search: search as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    });

    res.json(orders);
    return;
  } catch (err) {
    if (err instanceof PurchaseOrderServiceError) {
      res.status(err.statusCode).json({ message: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
    return;
  }
};

// GET /api/purchase-orders/:id
export const getPurchaseOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const order = await PurchaseOrderService.getPurchaseOrderById(id);
    res.json(order);
    return;
  } catch (err) {
    if (err instanceof PurchaseOrderServiceError) {
      res.status(err.statusCode).json({ message: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
    return;
  }
};

// PUT /api/purchase-orders/:id/confirm
// WarehouseStaff xác nhận nhận hàng → updateInventory()
export const confirmReceipt = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const confirmedBy = req.user!.userId;
    const { receivedItems } = req.body;

    if (!receivedItems) {
      res.status(400).json({ message: 'Thiếu receivedItems' });
      return;
    }

    const order = await PurchaseOrderService.confirmReceipt(id, {
      confirmedBy,
      receivedItems,
    });

    res.json(order);
    return;
  } catch (err) {
    if (err instanceof PurchaseOrderServiceError) {
      res.status(err.statusCode).json({ message: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
    return;
  }
};

// PUT /api/purchase-orders/:id/cancel
// Manager huỷ đơn (chỉ khi status = pending)
export const cancelPurchaseOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const order = await PurchaseOrderService.cancelOrder(id);
    res.json(order);
    return;
  } catch (err) {
    if (err instanceof PurchaseOrderServiceError) {
      res.status(err.statusCode).json({ message: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
    return;
  }
};