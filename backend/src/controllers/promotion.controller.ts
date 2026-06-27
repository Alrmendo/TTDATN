import { Request, Response } from 'express';
import { Promotion, Product } from '../models';

export const getPromotions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const promotions = await Promotion.findAll({
      include: [
        {
          model: Product,
          attributes: ['productName'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(promotions);
  } catch {
    res.status(500).json({
      message: 'Lỗi máy chủ nội bộ',
    });
  }
};

export const createPromotion = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      type,
      value,
      productId,
      minOrderValue,
      startDate,
      endDate,
    } = req.body;

    const promotion = await Promotion.create({
      name,
      type,
      value,
      productId,
      minOrderValue,
      startDate,
      endDate,
    });

    res.status(201).json(promotion);
  } catch {
    res.status(500).json({
      message: 'Lỗi máy chủ nội bộ',
    });
  }
};

export const deactivatePromotion = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const promotion = await Promotion.findByPk(String(req.params.id));

    if (!promotion) {
      res.status(404).json({
        message: 'Không tìm thấy khuyến mãi',
      });
      return;
    }

    await promotion.update({
      isActive: false,
    });

    res.status(200).json({
      message: 'Đã vô hiệu hóa khuyến mãi',
    });
  } catch {
    res.status(500).json({
      message: 'Lỗi máy chủ nội bộ',
    });
  }
};

export const updatePromotion = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const promotion = await Promotion.findByPk(String(req.params.id));

    if (!promotion) {
      res.status(404).json({
        message: 'Không tìm thấy khuyến mãi',
      });
      return;
    }

    const {
      name,
      type,
      value,
      productId,
      minOrderValue,
      startDate,
      endDate,
    } = req.body;

    await promotion.update({
      name,
      type,
      value,
      productId,
      minOrderValue,
      startDate,
      endDate,
    });

    res.status(200).json(promotion);
  } catch {
    res.status(500).json({
      message: 'Lỗi máy chủ nội bộ',
    });
  }
};