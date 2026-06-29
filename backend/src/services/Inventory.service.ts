import { Op, Sequelize } from 'sequelize';
import { Inventory, Product, Store, Category } from '../models';

// Product.belongsTo(Category) and Inventory.belongsTo(Product/Store) are defined
// with no `as:` alias in models/index.ts, so Sequelize's default include accessor
// is the model name as exported (PascalCase: `Product`, `Store`, `Category`).

export type AdjustMode = 'increase' | 'decrease';

export class InventoryError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// Sequelize association aliases vary by project (default model name vs custom `as:`).
// These helpers read either shape so the DTOs below don't break if your models/index.ts
// uses a different alias than assumed here.
const getProductJoin = (rec: any) => rec.Product ?? rec.product ?? null;
const getStoreJoin = (rec: any) => rec.Store ?? rec.store ?? null;

const toStockDTO = (rec: any) => {
  const product = getProductJoin(rec);
  const category = product?.Category ?? product?.category ?? null;
  return {
    id: rec.id,
    storeId: rec.storeId,
    productId: rec.productId,
    productName: product?.productName ?? null,
    sku: product?.sku ?? null,
    categoryName: category?.name ?? null,
    price: product?.price ?? null,
    costPrice: product?.costPrice ?? null,
    isActive: product?.isActive ?? null,
    quantity: rec.quantity,
    lowStockThreshold: rec.lowStockThreshold,
    lastUpdated: rec.lastUpdated,
  };
};

const toLowStockDTO = (rec: any) => {
  const product = getProductJoin(rec);
  const store = getStoreJoin(rec);
  return {
    id: rec.id,
    storeId: rec.storeId,
    storeName: store?.storeName ?? null,
    productId: rec.productId,
    productName: product?.productName ?? null,
    sku: product?.sku ?? null,
    quantity: rec.quantity,
    lowStockThreshold: rec.lowStockThreshold,
  };
};

/**
 * InventoryService — theo đúng method signature đã chốt trong Schema.md mục 5
 * và bảng "Method signatures dùng chung — BẮT BUỘC tuân theo" ở cuối Schema.md.
 *
 * CHỈ updateInventory() là method được phép thay đổi quantity ở service layer
 * (nó gọi model-layer Inventory.adjustQuantity(delta)). KHÔNG thêm biến thể
 * signature khác (vd. setQuantity, adjustStock ở layer này) — màn hình "Cập nhật
 * tồn kho thực tế" trong WarehouseManagement vẫn phải đi qua updateInventory(),
 * controller chỉ chịu trách nhiệm tính delta trước khi gọi (xem inventoryController).
 */
const InventoryService = {
  async updateInventory(
    storeId: string,
    productId: string,
    quantity: number,
    mode: AdjustMode
  ) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new InventoryError('Số lượng phải là số nguyên dương');
    }
    if (mode !== 'increase' && mode !== 'decrease') {
      throw new InventoryError("mode phải là 'increase' hoặc 'decrease'");
    }

    // Tìm bản ghi inventory theo (storeId, productId); nếu chưa có thì tạo mới với quantity = 0
    let record = await Inventory.findOne({ where: { storeId, productId } });
    if (!record) {
      record = await Inventory.create({ storeId, productId, quantity: 0 } as any);
    }

    const delta = mode === 'increase' ? quantity : -quantity;

    // Inventory.adjustQuantity(delta) tự throw "Tồn kho không đủ" nếu kết quả < 0
    try {
      await (record as any).adjustQuantity(delta);
    } catch (err) {
      throw new InventoryError((err as Error).message || 'Tồn kho không đủ');
    }

    return {
      id: (record as any).id,
      storeId: (record as any).storeId,
      productId: (record as any).productId,
      quantity: (record as any).quantity,
      lowStockThreshold: (record as any).lowStockThreshold,
      lastUpdated: (record as any).lastUpdated,
    };
  },

  /**
   * Đọc 1 bản ghi inventory theo (storeId, productId) — KHÔNG ghi/thay đổi dữ liệu.
   * Dùng để controller tính delta trước khi gọi updateInventory() ở trên
   * (vd. màn "Cập nhật tồn kho thực tế" nhập số tuyệt đối, không phải số lệch).
   */
  async getInventoryRecord(storeId: string, productId: string) {
    const record = await Inventory.findOne({ where: { storeId, productId } });
    return record ? toStockDTO(record) : null;
  },

  /**
   * Lấy toàn bộ tồn kho của 1 chi nhánh — dùng cho màn hình "Quản lý kho".
   */
  async getStockByStore(storeId: string) {
    const records = await Inventory.findAll({
      where: { storeId },
      include: [
        {
          model: Product,
          attributes: ['id', 'productName', 'sku', 'price', 'costPrice', 'isActive'],
          include: [{ model: Category, attributes: ['id', 'name'] }],
        },
      ],
      order: [['lastUpdated', 'DESC']],
    });
    return records.map(toStockDTO);
  },

  /**
   * Trả về các bản ghi inventory có quantity < lowStockThreshold.
   * storeId là optional — không truyền thì quét toàn hệ thống (dùng cho dashboard Manager).
   */
  async checkLowStock(storeId?: string) {
    const conditions: any[] = [
      Sequelize.where(Sequelize.col('quantity'), Op.lt, Sequelize.col('lowStockThreshold')),
    ];
    if (storeId) {
      conditions.push({ storeId });
    }

    const records = await Inventory.findAll({
      where: { [Op.and]: conditions },
      include: [
        { model: Product, attributes: ['id', 'productName', 'sku'] },
        { model: Store, attributes: ['id', 'storeName'] },
      ],
      order: [['quantity', 'ASC']],
    });
    return records.map(toLowStockDTO);
  },
};

export default InventoryService;
