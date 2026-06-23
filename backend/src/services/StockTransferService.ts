// backend/src/services/StockTransferService.ts
//
// Theo UC-02 và Schema.md §9:
//   - Manager khởi tạo phiếu điều chuyển (createTransfer)
//   - WarehouseStaff ở toStoreId xác nhận (confirmTransfer) → updateInventory() 2 chiều
//
// updateInventory() dùng CHUNG với SD-04/SD-05 — KHÔNG viết riêng logic tồn kho ở đây.

import { Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import { StockTransfer } from '../models/stock-transfer.model';
import { Store } from '../models/store.model';
import { Product } from '../models/product.model';
import { User } from '../models/user.model';
import { InventoryService } from './InventoryService';

export interface CreateTransferInput {
  fromStoreId: string;
  toStoreId: string;
  productId: string;
  quantity: number;
  createdBy: string; // userId của Manager
}

export class StockTransferServiceError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'StockTransferServiceError';
  }
}

export class StockTransferService {
  /**
   * Manager khởi tạo phiếu điều chuyển hàng giữa 2 chi nhánh.
   */
  static async createTransfer(data: CreateTransferInput): Promise<StockTransfer> {
    const { fromStoreId, toStoreId, productId, quantity, createdBy } = data;

    if (fromStoreId === toStoreId) {
      throw new StockTransferServiceError('Chi nhánh nguồn và đích không được trùng nhau', 400);
    }
    if (!quantity || quantity <= 0) {
      throw new StockTransferServiceError('Số lượng phải lớn hơn 0', 400);
    }

    const transfer = await StockTransfer.create({
      fromStoreId,
      toStoreId,
      productId,
      quantity,
      createdBy,
      status: 'pending',
      confirmedBy: null,
      confirmedAt: null,
    });

    const created = await StockTransfer.findByPk(transfer.id, {
      include: [
        { model: Store, as: 'fromStore', attributes: ['id', 'storeName'] },
        { model: Store, as: 'toStore', attributes: ['id', 'storeName'] },
        { model: Product, as: 'product', attributes: ['id', 'productName', 'sku'] },
        { model: User, as: 'creator', attributes: ['id', 'fullName', 'email'] },
      ],
    });

    return created as StockTransfer;
  }

  /**
   * WarehouseStaff ở toStoreId xác nhận đã nhận hàng điều chuyển.
   * Trừ kho fromStoreId, cộng kho toStoreId — đều qua InventoryService.updateInventory()
   * dùng chung. Nếu cộng kho đích thất bại sau khi đã trừ kho nguồn, rollback bằng
   * cách cộng lại kho nguồn.
   */
  static async confirmTransfer(transferId: string, confirmedBy: string): Promise<StockTransfer> {
    const transfer = await StockTransfer.findByPk(transferId);
    if (!transfer) {
      throw new StockTransferServiceError('Không tìm thấy phiếu điều chuyển', 404);
    }
    if (transfer.status === 'completed') {
      throw new StockTransferServiceError('Phiếu điều chuyển đã được xác nhận', 400);
    }

    const { fromStoreId, toStoreId, productId, quantity } = transfer;

    return sequelize.transaction(async (t: Transaction) => {
      // Truyền t vào cả 2 lệnh updateInventory + transfer.update — atomic thật 100%,
      // nếu increase ở kho đích fail thì decrease ở kho nguồn cũng rollback theo t.
      await InventoryService.updateInventory(fromStoreId, productId, quantity, 'decrease', t);
      await InventoryService.updateInventory(toStoreId, productId, quantity, 'increase', t);

      await transfer.update(
        {
          status: 'completed',
          confirmedBy,
          confirmedAt: new Date(),
        },
        { transaction: t }
      );

      return transfer;
    });
  }
}
