import { Request, Response } from 'express';
import { Op, fn, col, where as sequelizeWhere, UniqueConstraintError } from 'sequelize';
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

const generateSku = async (): Promise<string> => {
  const lastProduct = await Product.findOne({
    order: [['sku', 'DESC']],
    attributes: ['sku'],
  });

  if (!lastProduct) {
    return 'SP0001';
  }

  const lastSku = lastProduct.sku;
  const nextNumber = parseInt(lastSku.slice(2), 10) + 1;

  if (nextNumber > 9999) {
    throw new Error('Đã hết mã SKU');
  }

  return `SP${nextNumber.toString().padStart(4, '0')}`;
};

export const createProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      productName,
      categoryId,
      description,
      price,
      costPrice,
    } = req.body;

    const sku = await generateSku();

    const product = await Product.create({
      productName,
      sku,
      categoryId,
      description,
      price,
      costPrice,
    });

    res.status(201).json(product);
  } catch (error) {

    if (error instanceof UniqueConstraintError) {
      res.status(409).json({
        message: 'SKU đã tồn tại',
      });
      return;
    }

    res.status(500).json({
      message: 'Lỗi máy chủ nội bộ',
    });
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
