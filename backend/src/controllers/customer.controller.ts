import { Request, Response } from 'express';
import { Op, fn, col, where as sequelizeWhere } from 'sequelize';
import { Customer, LoyaltyPoint } from '../models';

export const searchCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = req.query.q as string | undefined;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = q
      ? {
          // unaccent() để tìm không phân biệt dấu tiếng Việt
          [Op.or]: [
            sequelizeWhere(fn('unaccent', col('fullName')), { [Op.iLike]: fn('unaccent', `%${q}%`) }),
            { phone: { [Op.iLike]: `%${q}%` } },
          ],
        }
      : {};

    const customers = await Customer.findAll({
      where,
      include: [{ model: LoyaltyPoint, as: 'loyaltyPoints', attributes: ['points'], required: false }],
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(customers);
    return;
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { fullName, phone, email, address } = req.body as {
      fullName?: string;
      phone?: string;
      email?: string;
      address?: string;
    };

    const customer = await Customer.findByPk(id);
    if (!customer) {
      res.status(404).json({ message: 'Không tìm thấy khách hàng' });
      return;
    }

    if (phone) {
      const existing = await Customer.findOne({ where: { phone, id: { [Op.ne]: id } } });
      if (existing) {
        res.status(409).json({ message: 'Số điện thoại đã tồn tại' });
        return;
      }
    }

    await customer.update({
      fullName: fullName ?? customer.fullName,
      phone: phone ?? customer.phone,
      email: email ?? customer.email,
      address: address ?? customer.address,
    });

    res.status(200).json(customer);
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
