// backend/src/services/InventoryService.ts
//
// THEO Schema.md §5 — "Method signatures dùng chung — BẮT BUỘC tuân theo":
//
//   InventoryService.updateInventory(storeId, productId, quantity, mode)
//
// Đây là entry point DUY NHẤT để thay đổi tồn kho trong toàn hệ thống.
// SD-04 (bán hàng), SD-05 (nhập hàng), stock_transfers (UC-02) đều PHẢI
// gọi qua đây — KHÔNG viết lại riêng từng module.
//
// mode: 'increase' (nhập hàng, điều chuyển đến) | 'decrease' (bán hàng, điều chuyển đi)
//
// Service tìm bản ghi inventory theo (storeId, productId); nếu chưa có thì
// tạo mới với quantity = 0 trước, sau đó gọi Inventory.adjustQuantity(delta)
// của bản ghi đó với delta = +quantity (increase) hoặc -quantity (decrease).

import { Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import { Inventory } from '../models/inventory.model';

export type InventoryUpdateMode = 'increase' | 'decrease';

export class InventoryServiceError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'InventoryServiceError';
  }
}

export class InventoryService {
  /**
   * Cập nhật tồn kho — DÙNG CHUNG cho mọi nghiệp vụ (SD-04, SD-05, UC-02).
   *
   * @param storeId   UUID chi nhánh
   * @param productId UUID sản phẩm
   * @param quantity  số lượng thay đổi (luôn dương; chiều +/- do `mode` quyết định)
   * @param mode      'increase' | 'decrease'
   */
  static async updateInventory(
    storeId: string,
    productId: string,
    quantity: number,
    mode: InventoryUpdateMode,
    transaction?: Transaction
  ): Promise<Inventory> {
    if (quantity <= 0) {
      throw new InventoryServiceError('quantity phải là số dương', 400);
    }
    if (mode !== 'increase' && mode !== 'decrease') {
      throw new InventoryServiceError("mode phải là 'increase' hoặc 'decrease'", 400);
    }

    const run = async (t: Transaction) => {
      // Lock dòng tồn kho để tránh race condition khi nhiều giao dịch
      // (bán hàng, nhập hàng, điều chuyển) cùng sửa 1 sản phẩm/chi nhánh.
      let record = await Inventory.findOne({
        where: { storeId, productId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      // Theo Schema.md §5: "Nếu chưa có thì tạo mới với quantity = 0 trước"
      if (!record) {
        record = await Inventory.create(
          { storeId, productId, quantity: 0 },
          { transaction: t }
        );
      }

      const delta = mode === 'increase' ? quantity : -quantity;

      try {
        await record.adjustQuantity(delta, t);
      } catch (err) {
        // Inventory.adjustQuantity throw Error('Tồn kho không đủ') khi < 0
        throw new InventoryServiceError(
          err instanceof Error ? err.message : 'Tồn kho không đủ',
          409
        );
      }

      return record;
    };

    // Nếu được truyền transaction từ ngoài (vd. StockTransferService cần atomic
    // chung với các thao tác khác), dùng lại transaction đó thay vì tự mở transaction mới.
    if (transaction) {
      return run(transaction);
    }

    return sequelize.transaction(run);
  }

  /**
   * InventoryService.checkLowStock(storeId): List<Inventory>
   * Trả về các bản ghi có quantity < lowStockThreshold.
   */
  static async checkLowStock(storeId?: string): Promise<Inventory[]> {
    const { Op } = await import('sequelize');
    const where: Record<string, unknown> = {
      quantity: { [Op.lt]: sequelize.col('lowStockThreshold') },
    };
    if (storeId) {
      where.storeId = storeId;
    }

    return Inventory.findAll({ where });
  }

  /**
   * InventoryService.getStockByStore(storeId): List<Inventory>
   */
  static async getStockByStore(storeId: string): Promise<Inventory[]> {
    if (!storeId) {
      throw new InventoryServiceError('storeId là bắt buộc', 400);
    }
    return Inventory.findAll({ where: { storeId } });
  }

  /**
   * Helper dùng trong OrderService.addItem (SD-04 bước 9) — kiểm tra tồn kho
   * trước khi thêm sản phẩm vào hóa đơn, KHÔNG trừ kho ở bước này.
   * Việc trừ kho thật sự chỉ xảy ra ở confirmPayment qua updateInventory(..., 'decrease').
   */
  static async checkStock(storeId: string, productId: string, quantity: number): Promise<void> {
    const record = await Inventory.findOne({ where: { storeId, productId } });
    const available = record?.quantity ?? 0;
    if (available < quantity) {
      throw new InventoryServiceError('Tồn kho không đủ', 409);
    }
  }
}
