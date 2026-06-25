// backend/src/services/PurchaseOrderService.ts
//
// Theo SD-05 và Schema.md §7:
//   - Manager tạo đơn nhập hàng (createPurchaseOrder)
//   - WarehouseStaff xác nhận nhận hàng (confirmReceipt) → gọi InventoryService.updateInventory()
//
// updateInventory() dùng CHUNG với SD-04 (bán hàng) — KHÔNG viết riêng.

import { sequelize } from '../config/database';
import { PurchaseOrder } from '../models/purchase-order.model';
import { PurchaseOrderDetail } from '../models/purchase-order-detail.model';
import { Product } from '../models/product.model';
import { Supplier } from '../models/supplier.model';
import { Store } from '../models/store.model';
import { User } from '../models/user.model';
import { InventoryService } from './InventoryService';
import { Transaction, Op } from 'sequelize';

export interface CreatePurchaseOrderInput {
  supplierId: string;
  storeId: string;
  createdBy: string; // userId của Manager
  items: {
    productId: string;
    quantity: number;
    unitCost: number;
  }[];
}

// Số lượng thực nhận có thể khác với đơn (SD-05 alt flow bước 17)
export interface ReceivedItem {
  productId: string;
  receivedQuantity: number;
}

export interface ConfirmReceiptInput {
  confirmedBy: string; // userId của WarehouseStaff
  receivedItems: ReceivedItem[];
}

export class PurchaseOrderServiceError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'PurchaseOrderServiceError';
  }
}

export class PurchaseOrderService {
  /**
   * Manager tạo đơn nhập hàng (SD-05 bước 1-5).
   * Tính totalCost từ items.
   */
  static async createPurchaseOrder(input: CreatePurchaseOrderInput): Promise<PurchaseOrder> {
    const { supplierId, storeId, createdBy, items } = input;

    if (!items || items.length === 0) {
      throw new PurchaseOrderServiceError('Đơn nhập hàng phải có ít nhất 1 sản phẩm', 400);
    }

    // Validate supplier, store tồn tại
    const supplier = await Supplier.findByPk(supplierId);
    if (!supplier) throw new PurchaseOrderServiceError('Nhà cung cấp không tồn tại', 404);

    const store = await Store.findByPk(storeId);
    if (!store) throw new PurchaseOrderServiceError('Chi nhánh không tồn tại', 404);

    const totalCost = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);

    return sequelize.transaction(async (t: Transaction) => {
      const order = await PurchaseOrder.create(
        {
          supplierId,
          storeId,
          createdBy,
          status: 'pending',
          totalCost,
        },
        { transaction: t }
      );

      const details = items.map((item) => ({
        purchaseOrderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        receivedQuantity: null,
      }));

      await PurchaseOrderDetail.bulkCreate(details, { transaction: t });

      return order;
    });
  }

  /**
   * Lấy danh sách đơn nhập hàng với filter.
   * Manager thấy tất cả store, WarehouseStaff chỉ thấy store của mình.
   */
  static async getPurchaseOrders(params: {
    storeId?: string;
    status?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PurchaseOrder[]> {
    const where: Record<string, unknown> = {};

    if (params.storeId) where.storeId = params.storeId;
    if (params.status) where.status = params.status;

    if (params.startDate || params.endDate) {
      const range: Record<string, Date> = {};
      if (params.startDate) range[Op.gte as unknown as string] = new Date(params.startDate);
      if (params.endDate) range[Op.lte as unknown as string] = new Date(params.endDate);
      (where as any).createdAt = range;
    }

    return PurchaseOrder.findAll({
      where,
      include: [
        { model: Supplier, attributes: ['id', 'supplierName', 'contactInfo'] },
        { model: Store, attributes: ['id', 'storeName'] },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'fullName', 'email'],
        },
        {
          model: User,
          as: 'confirmer',
          attributes: ['id', 'fullName', 'email'],
        },
        {
          model: PurchaseOrderDetail,
          as: 'details',
          include: [{ model: Product, as: 'product', attributes: ['id', 'productName', 'sku'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Lấy chi tiết 1 đơn nhập hàng.
   */
  static async getPurchaseOrderById(id: string): Promise<PurchaseOrder> {
    const order = await PurchaseOrder.findByPk(id, {
      include: [
        { model: Supplier, attributes: ['id', 'supplierName', 'contactInfo'] },
        { model: Store, attributes: ['id', 'storeName'] },
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
        { model: User, as: 'confirmer', attributes: ['id', 'fullName', 'email'] },
        {
          model: PurchaseOrderDetail,
          as: 'details',
          include: [{ model: Product, as: 'product', attributes: ['id', 'productName', 'sku', 'price', 'costPrice'] }],
        },
      ],
    });

    if (!order) throw new PurchaseOrderServiceError('Đơn nhập hàng không tồn tại', 404);
    return order;
  }

  /**
   * WarehouseStaff xác nhận nhận hàng (SD-05 bước 14-18).
   * receivedItems dùng số lượng thực tế — có thể khác số lượng đặt (alt flow bước 17).
   * Gọi InventoryService.updateInventory() cho từng item đã nhận.
   */
  static async confirmReceipt(id: string, input: ConfirmReceiptInput): Promise<PurchaseOrder> {
    const order = await PurchaseOrder.findByPk(id, {
      include: [
        {
          model: PurchaseOrderDetail,
          as: 'details',
        },
      ],
    });

    if (!order) throw new PurchaseOrderServiceError('Đơn nhập hàng không tồn tại', 404);
    if (order.status !== 'pending') {
      throw new PurchaseOrderServiceError(
        `Đơn đã ở trạng thái "${order.status}" — không thể xác nhận`,
        409
      );
    }

    const { confirmedBy, receivedItems } = input;

    if (!receivedItems || receivedItems.length === 0) {
      throw new PurchaseOrderServiceError('Phải có ít nhất 1 sản phẩm xác nhận nhận', 400);
    }

    return sequelize.transaction(async (t: Transaction) => {
      // Cập nhật receivedQuantity cho từng detail
      const details = (order as any).details as PurchaseOrderDetail[];
      for (const received of receivedItems) {
        const detail = details.find((d) => d.productId === received.productId);
        if (!detail) {
          throw new PurchaseOrderServiceError(
            `Sản phẩm ${received.productId} không có trong đơn`,
            400
          );
        }
        if (received.receivedQuantity < 0) {
          throw new PurchaseOrderServiceError('Số lượng nhận không được âm', 400);
        }
        await detail.update({ receivedQuantity: received.receivedQuantity }, { transaction: t });

        // Chỉ cập nhật tồn kho nếu thực nhận > 0
        if (received.receivedQuantity > 0) {
          // Dùng CHUNG InventoryService.updateInventory() — Schema.md §5 "Method signatures dùng chung"
          await InventoryService.updateInventory(
            order.storeId,
            received.productId,
            received.receivedQuantity,
            'increase'
          );
        }
      }

      await order.update(
        {
          status: 'completed',
          confirmedBy,
          confirmedAt: new Date(),
        },
        { transaction: t }
      );

      return order;
    });
  }

  /**
   * Manager huỷ đơn nhập hàng (chỉ được huỷ khi còn pending).
   */
  static async cancelOrder(id: string): Promise<PurchaseOrder> {
    const order = await PurchaseOrder.findByPk(id);
    if (!order) throw new PurchaseOrderServiceError('Đơn nhập hàng không tồn tại', 404);
    if (order.status !== 'pending') {
      throw new PurchaseOrderServiceError(
        `Không thể huỷ đơn đang ở trạng thái "${order.status}"`,
        409
      );
    }
    await order.update({ status: 'cancelled' });
    return order;
  }
}