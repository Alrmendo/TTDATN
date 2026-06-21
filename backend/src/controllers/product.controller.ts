import { Request, Response } from 'express';
import { Op, fn, col, where as sequelizeWhere } from 'sequelize';
import { Product, Category } from '../models';

export const searchProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = req.query.q as string | undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isActive: true };
    if (q) {
      // unaccent() để tìm không phân biệt dấu tiếng Việt (vd "banh" khớp "Bánh")
      const pattern = `%${q}%`;
      where[Op.and] = [
        {
          [Op.or]: [
            sequelizeWhere(fn('unaccent', col('productName')), { [Op.iLike]: fn('unaccent', pattern) }),
            sequelizeWhere(fn('unaccent', col('sku')), { [Op.iLike]: fn('unaccent', pattern) }),
          ],
        },
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

export const getProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const products = await Product.findAll({
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['categoryName'],
        },
      ],
      order: [['productName', 'ASC']],
    });

    res.status(200).json(products);
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

export const createProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      productName,
      sku,
      categoryId,
      description,
      price,
      costPrice,
    } = req.body;

    const product = await Product.create({
      productName,
      sku,
      categoryId,
      description,
      price,
      costPrice,
    });

    res.status(201).json(product);
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

export const updateProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const product = await Product.findByPk(String(req.params.id));

    if (!product) {
      res.status(404).json({
        message: 'Không tìm thấy sản phẩm',
      });
      return;
    }

    await product.update(req.body);

    res.status(200).json(product);
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

export const deleteProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const product = await Product.findByPk(String(req.params.id));

    if (!product) {
      res.status(404).json({
        message: 'Không tìm thấy sản phẩm',
      });
      return;
    }

    await product.update({
      isActive: false,
    });

    res.status(200).json({
      message: 'Đã vô hiệu hóa sản phẩm',
    });
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};
