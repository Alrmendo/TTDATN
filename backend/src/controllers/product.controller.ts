import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Product, Category } from '../models';

export const searchProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = req.query.q as string | undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isActive: true };
    if (q) {
      where[Op.or] = [
        { productName: { [Op.iLike]: `%${q}%` } },
        { sku: { [Op.iLike]: `%${q}%` } },
      ];
    }

    const products = await Product.findAll({
      where,
      include: [{ model: Category, as: 'category', attributes: ['categoryName'] }],
      order: [['productName', 'ASC']],
    });

    res.status(200).json(products);
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};
