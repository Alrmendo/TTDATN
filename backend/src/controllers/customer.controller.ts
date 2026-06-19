import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Customer, LoyaltyPoint } from '../models';

export const searchCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = req.query.q as string | undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = q
      ? {
          [Op.or]: [
            { fullName: { [Op.iLike]: `%${q}%` } },
            { phone: { [Op.iLike]: `%${q}%` } },
          ],
        }
      : {};

    const customers = await Customer.findAll({
      where,
      include: [{ model: LoyaltyPoint, attributes: ['points'], required: false }],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(customers);
    return;
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, phone, email, address } = req.body as {
      fullName?: string;
      phone?: string;
      email?: string;
      address?: string;
    };

    if (!fullName || !phone) {
      res.status(400).json({ message: 'fullName và phone là bắt buộc' });
      return;
    }

    const existing = await Customer.findOne({ where: { phone } });
    if (existing) {
      res.status(409).json({ message: 'Số điện thoại đã tồn tại' });
      return;
    }

    const customer = await Customer.create({
      fullName,
      phone,
      email: email ?? null,
      address: address ?? null,
    });

    await LoyaltyPoint.create({ customerId: customer.id, points: 0 });

    res.status(201).json(customer);
    return;
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};
