import { Request, Response } from 'express';
import {
  PurchaseOrderPaymentService,
  PurchaseOrderPaymentServiceError,
} from '../services/PurchaseOrderPaymentService';

// GET /api/purchase-orders/:id/payments
export const getPurchaseOrderPaymentSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const summary = await PurchaseOrderPaymentService.getPaymentSummary(req.params.id as string);
    res.json(summary);
    return;
  } catch (err) {
    if (err instanceof PurchaseOrderPaymentServiceError) {
      res.status(err.statusCode).json({ message: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
    return;
  }
};

// POST /api/purchase-orders/:id/payments
export const recordPurchaseOrderPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const amount = Number(req.body.amount);
    if (!req.body.amount || !Number.isFinite(amount)) {
      res.status(400).json({ message: 'Thiếu hoặc số tiền thanh toán không hợp lệ' });
      return;
    }

    const summary = await PurchaseOrderPaymentService.recordPayment({
      purchaseOrderId: req.params.id as string,
      amount,
      userId: req.user!.userId,
    });
    res.status(201).json(summary);
    return;
  } catch (err) {
    if (err instanceof PurchaseOrderPaymentServiceError) {
      res.status(err.statusCode).json({ message: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ message: 'Lỗi server' });
    return;
  }
};