import { Request, Response } from 'express';
import { Supplier } from '../models';

export const getSuppliers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const suppliers = await Supplier.findAll({
      order: [['supplierName', 'ASC']],
    });

    res.json({
      data: suppliers,
    });
    return;
  } catch {
    res.status(500).json({
      message: 'Lỗi hệ thống',
    });
  }
};

export const createSupplier = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { supplierName, contactInfo } = req.body;

    if (!supplierName) {
      res.status(400).json({
        message: 'supplierName là bắt buộc',
      });
      return;
    }

    const supplier = await Supplier.create({
      supplierName,
      contactInfo,
    });

    res.status(201).json({
      data: supplier,
    });
    return;
  } catch {
    res.status(500).json({
      message: 'Lỗi hệ thống',
    });
  }
};