import { Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import { PurchaseOrder } from '../models/purchase-order.model';
import { PurchaseOrderPayment } from '../models/purchase-order-payment.model';
import { User } from '../models/user.model';

export interface PaymentSummary {
  purchaseOrderId: string;
  totalCost: number;
  totalPaid: number;
  remainingDebt: number;
  payments: PurchaseOrderPayment[];
}

export class PurchaseOrderPaymentServiceError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'PurchaseOrderPaymentServiceError';
  }
}

export class PurchaseOrderPaymentService {
  static async getPaymentSummary(purchaseOrderId: string): Promise<PaymentSummary> {
    const order = await PurchaseOrder.findByPk(purchaseOrderId);
    if (!order) {
      throw new PurchaseOrderPaymentServiceError('Đơn nhập hàng không tồn tại', 404);
    }

    const payments = await PurchaseOrderPayment.findAll({
      where: { purchaseOrderId },
      include: [{ model: User, as: 'payer', attributes: ['id', 'fullName', 'email'] }],
      order: [['paidAt', 'DESC']],
    });

    const totalCost = Number(order.totalCost);
    const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

    return {
      purchaseOrderId,
      totalCost,
      totalPaid,
      remainingDebt: Math.max(0, totalCost - totalPaid),
      payments,
    };
  }

  static async recordPayment(input: {
    purchaseOrderId: string;
    amount: number;
    userId: string;
  }): Promise<PaymentSummary> {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new PurchaseOrderPaymentServiceError('Số tiền thanh toán phải lớn hơn 0', 400);
    }

    await sequelize.transaction(async (t: Transaction) => {
      const order = await PurchaseOrder.findByPk(input.purchaseOrderId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!order) {
        throw new PurchaseOrderPaymentServiceError('Đơn nhập hàng không tồn tại', 404);
      }
      if (order.status !== 'debt' && order.status !== 'completed') {
        throw new PurchaseOrderPaymentServiceError(
          'Chỉ được thanh toán sau khi WarehouseStaff xác nhận nhận hàng',
          409
        );
      }

      const payments = await PurchaseOrderPayment.findAll({
        where: { purchaseOrderId: input.purchaseOrderId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      const remainingDebt = Number(order.totalCost) - totalPaid;

      if (remainingDebt <= 0.005) {
        throw new PurchaseOrderPaymentServiceError('Đơn nhập hàng đã thanh toán đủ', 409);
      }
      if (input.amount > remainingDebt + 0.005) {
        throw new PurchaseOrderPaymentServiceError(
          `Số tiền thanh toán vượt quá số nợ còn lại (${remainingDebt.toFixed(2)})`,
          409
        );
      }

      await PurchaseOrderPayment.create(
        {
          purchaseOrderId: input.purchaseOrderId,
          amount: input.amount,
          userId: input.userId,
        },
        { transaction: t }
      );

      if (totalPaid + input.amount >= Number(order.totalCost) - 0.005) {
        await order.update({ status: 'completed' }, { transaction: t });
      }
    });

    return this.getPaymentSummary(input.purchaseOrderId);
  }
}