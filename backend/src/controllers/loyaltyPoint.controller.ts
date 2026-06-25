import { Request, Response } from 'express';
import { LoyaltyPointService } from '../services/LoyaltyPointService';

export const getBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = req.query.customerId as string;

    if (!customerId) {
      res.status(400).json({ message: 'customerId là bắt buộc' });
      return;
    }

    const balance = await LoyaltyPointService.getBalance(customerId);

    res.status(200).json({ customerId, balance });
    return;
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

export const redeemPoints = async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerId, amount } = req.body as { customerId?: string; amount?: number };

    if (!customerId || !amount || amount <= 0) {
      res.status(400).json({ message: 'customerId và amount (> 0) là bắt buộc' });
      return;
    }

    const success = await LoyaltyPointService.redeemPoints(customerId, amount);

    if (!success) {
      res.status(422).json({ message: 'Số điểm không đủ' });
      return;
    }

    const balance = await LoyaltyPointService.getBalance(customerId);

    res.status(200).json({ customerId, balance });
    return;
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};
