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

export const createCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { categoryName, description } = req.body;

    const category = await Category.create({
      categoryName,
      description,
    });

    res.status(201).json(category);
  } catch {
    res.status(500).json({
      message: 'Lỗi máy chủ nội bộ',
    });
  }
};

export const updateCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const category = await Category.findByPk(
      String(req.params.id)
    );

    if (!category) {
      res.status(404).json({
        message: 'Không tìm thấy danh mục',
      });
      return;
    }

    const { categoryName, description } = req.body;

    await category.update({
      categoryName,
      description,
    });

    res.status(200).json(category);
  } catch {
    res.status(500).json({
      message: 'Lỗi máy chủ nội bộ',
    });
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const category = await Category.findByPk(
      String(req.params.id)
    );

    if (!category) {
      res.status(404).json({
        message: 'Không tìm thấy danh mục',
      });
      return;
    }

    await category.destroy();

    res.status(200).json({
      message: 'Đã xóa danh mục',
    });
  } catch {
    res.status(500).json({
      message: 'Lỗi máy chủ nội bộ',
    });
  }
};