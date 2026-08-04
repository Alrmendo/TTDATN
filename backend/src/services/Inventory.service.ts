import { Op, Sequelize } from 'sequelize';
import { Inventory, Product, Store, Category } from '../models';

// Product.belongsTo(Category, { as: 'category' }) in models/index.ts
// → eager-load accessor is `product.category` (lowercase alias).
// Inventory.belongsTo(Product/Store) have no alias → PascalCase accessor.

export class InventoryError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const toStockDTO = (rec: any) => {
  const product = rec.Product ?? rec.product ?? null;
  const category = product?.category ?? product?.Category ?? null;
  const store = rec.Store ?? rec.store ?? null;
  return {
    id: rec.id,
    storeId: rec.storeId,
    storeName: store?.storeName ?? null,   // chỉ có giá trị khi query include Store (chế độ tổng thể)
    productId: rec.productId,
    productName: product?.productName ?? null,
    sku: product?.sku ?? null,
    categoryId: product?.categoryId ?? category?.id ?? null,
    categoryName: category?.categoryName ?? null,   // real field name is categoryName
    price: product?.price != null ? Number(product.price) : null,
    costPrice: product?.costPrice != null ? Number(product.costPrice) : null,
    isActive: product?.isActive ?? null,
    quantity: rec.quantity,
    lowStockThreshold: rec.lowStockThreshold,
    lastUpdated: rec.lastUpdated,
  };
};

const toLowStockDTO = (rec: any) => {
  const product = rec.Product ?? rec.product ?? null;
  const store   = rec.Store   ?? rec.store   ?? null;
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

export class InventoryService {
  /**
   * Kiểm tra tồn kho — throw InventoryError nếu không đủ.
   * Dùng trong SD-04 addItem (bước 9 alt flow 9a).
   */
  static async checkStock(storeId: string, productId: string, qty: number): Promise<void> {
    const record = await Inventory.findOne({ where: { storeId, productId } });
    const current = record ? (record as any).quantity : 0;
    if (current < qty) {
      throw new InventoryError(
        `Tồn kho không đủ (hiện có ${current}, yêu cầu ${qty})`
      );
    }
  }

  /**
   * Cập nhật tồn kho — entry point DÙNG CHUNG cho mọi module (Schema.md §5).
   * mode 'increase': nhập hàng / điều chuyển đến
   * mode 'decrease': bán hàng / điều chuyển đi
   */
  static async updateInventory(
    storeId: string,
    productId: string,
    quantity: number,
    mode: 'increase' | 'decrease'
  ) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new InventoryError('Số lượng phải là số nguyên dương');
    }

    let record = await Inventory.findOne({ where: { storeId, productId } });
    if (!record) {
      record = await Inventory.create({ storeId, productId, quantity: 0 } as any);
    }

    const delta = mode === 'increase' ? quantity : -quantity;

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
  }

  /**
   * Đọc bản ghi inventory theo (storeId, productId) — KHÔNG ghi.
   * Controller dùng để tính delta trước khi gọi updateInventory().
   */
  static async getInventoryRecord(storeId: string, productId: string) {
    const record = await Inventory.findOne({ where: { storeId, productId } });
    return record ? toStockDTO(record) : null;
  }

  /**
   * Lấy tồn kho — dùng cho màn Quản lý kho.
   * - storeId truyền vào: tồn kho của 1 chi nhánh cụ thể (như cũ).
   * - storeId bỏ trống: tồn kho TỔNG THỂ toàn hệ thống, gộp mọi chi nhánh
   *   (chỉ Manager mới được phép gọi ở chế độ này — controller chịu trách
   *   nhiệm ép storeId cho WarehouseStaff, service không tự kiểm tra role).
   */
  static async getStockByStore(storeId?: string) {
    const where: any = {};
    if (storeId) where.storeId = storeId;

    const records = await Inventory.findAll({
      where,
      include: [
        {
          model: Product,
          attributes: ['id', 'productName', 'sku', 'price', 'costPrice', 'isActive', 'categoryId'],
          include: [{ model: Category, as: 'category', attributes: ['id', 'categoryName'] }],
        },
        { model: Store, attributes: ['id', 'storeName'] },
      ],
      order: storeId
        ? [['lastUpdated', 'DESC']]
        : [[Store, 'storeName', 'ASC'], ['lastUpdated', 'DESC']],
    });
    return records.map(toStockDTO);
  }

  /**
   * Sản phẩm sắp hết (quantity < lowStockThreshold).
   * storeId optional — bỏ trống để quét toàn hệ thống (Manager dashboard).
   */
  static async checkLowStock(storeId?: string) {
    const conditions: any[] = [
      Sequelize.where(Sequelize.col('quantity'), Op.lt, Sequelize.col('lowStockThreshold')),
    ];
    if (storeId) conditions.push({ storeId });

    const records = await Inventory.findAll({
      where: { [Op.and]: conditions },
      include: [
        { model: Product, attributes: ['id', 'productName', 'sku'] },
        { model: Store,   attributes: ['id', 'storeName'] },
      ],
      order: [['quantity', 'ASC']],
    });
    return records.map(toLowStockDTO);
  }
}
