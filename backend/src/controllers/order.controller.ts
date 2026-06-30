import { Request, Response } from 'express';
import { Op, fn, col } from 'sequelize';
import { sequelize } from '../config/database';
import { OrderService } from '../services/OrderService';
import { Invoice, InvoiceDetail, Customer, User, Promotion, Product, Store } from '../models';

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const storeId = req.user!.storeId as string;
    const staffId = req.user!.userId;

    const invoice = await OrderService.createOrder(storeId, staffId);
    res.status(201).json(invoice);
    return;
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

export const addItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const invoiceId = req.params.id as string;
    const { productId, quantity } = req.body as { productId: string; quantity: number };
    const storeId = req.user!.storeId as string;

    const detail = await OrderService.addItem(invoiceId, productId, quantity, storeId);
    res.status(200).json(detail);
    return;
  } catch (err) {
    if (err instanceof Error && err.message === 'Tồn kho không đủ') {
      res.status(422).json({ message: 'Tồn kho không đủ' });
      return;
    }
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

export const removeItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const invoiceId = req.params.id as string;
    const productId = req.params.productId as string;

    await OrderService.removeItem(invoiceId, productId);
    res.status(200).json({ message: 'Đã xóa sản phẩm khỏi hóa đơn' });
    return;
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

export const applyPromotion = async (req: Request, res: Response): Promise<void> => {
  try {
    const invoiceId = req.params.id as string;
    const { promotionId } = req.body as { promotionId: string };

    const invoice = await OrderService.applyPromotion(invoiceId, promotionId);
    res.status(200).json(invoice);
    return;
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

export const confirmPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const invoiceId = req.params.id as string;
    const { paymentMethod, amount } = req.body as { paymentMethod: string; amount: number };

    const invoice = await OrderService.confirmPayment(invoiceId, paymentMethod, amount);
    res.status(200).json(invoice);
    return;
  } catch (err) {
    if (err instanceof Error && err.message === 'Số tiền không đủ') {
      res.status(422).json({ message: 'Số tiền không đủ' });
      return;
    }
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

export const getInvoices = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, search } = req.query as Record<string, string | undefined>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      // Lịch sử đơn hàng chỉ hiện đơn đã hoàn tất/đã hủy — bỏ qua các
      // draft chưa thanh toán (mỗi lần mở màn Bán hàng tạo 1 draft mới).
      status: { [Op.ne]: 'draft' },
    };

    if (req.user!.role === 'Staff') {
      where.storeId = req.user!.storeId;
    } else if (req.user!.role === 'Manager' && req.query.storeId) {
      where.storeId = req.query.storeId as string;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    if (search) {
      const matches = await Invoice.findAll({
        attributes: ['id'],
        include: [{ model: Customer, as: 'customer', attributes: [], required: false }],
        where: {
          [Op.or]: [
            sequelize.where(sequelize.cast(sequelize.col('Invoice.id'), 'text'), {
              [Op.iLike]: `%${search}%`,
            }),
            sequelize.where(fn('unaccent', col('customer.fullName')), {
              [Op.iLike]: fn('unaccent', `%${search}%`),
            }),
          ],
        },
      });
      where.id = { [Op.in]: matches.map((m) => m.id) };
    }

    const invoices = await Invoice.findAll({
      where,
      include: [
        {
          model: InvoiceDetail,
          as: 'invoiceDetails',
          include: [{ model: Product, as: 'product', attributes: ['productName', 'sku'] }],
        },
        { model: Customer, as: 'customer', attributes: ['fullName', 'phone'] },
        { model: User, as: 'staff', attributes: ['fullName'] },
        { model: Promotion, as: 'promotion', attributes: ['name'] },
        { model: Store, as: 'store', attributes: ['storeName'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = invoices.map((invoice) => {
      const json = invoice.toJSON() as any;
      json.subtotal = parseFloat(json.subtotal);
      json.discountAmount = parseFloat(json.discountAmount);
      json.totalAmount = parseFloat(json.totalAmount);
      if (Array.isArray(json.invoiceDetails)) {
        json.invoiceDetails = json.invoiceDetails.map((d: any) => ({
          ...d,
          unitPrice: parseFloat(d.unitPrice),
          subtotal: parseFloat(d.subtotal),
        }));
      }
      return json;
    });

    res.status(200).json(data);
    return;
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};
