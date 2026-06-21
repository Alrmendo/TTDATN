import { Request, Response } from 'express';
import { Category } from '../models';

export const getCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const categories = await Category.findAll({
      order: [['categoryName', 'ASC']],
    });

    res.status(200).json(categories);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Lỗi máy chủ nội bộ',
    });
  }
};