// backend/src/models/Inventory.ts
//
// Theo Schema.md §5 — bảng `inventory`.
// UNIQUE(storeId, productId) — mỗi sản phẩm chỉ có 1 bản ghi tồn kho / 1 chi nhánh.
//
// QUYẾT ĐỊNH ĐÃ CHỐT (Schema.md §5, ghi chú quyết định):
// Chỉ dùng đúng 2 method sau, KHÔNG tạo thêm biến thể khác:
//   - Inventory.adjustQuantity(delta)               [model layer — file này]
//   - InventoryService.updateInventory(storeId, productId, quantity, mode)  [service layer]

import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface InventoryAttributes {
  id: string;
  storeId: string;
  productId: string;
  quantity: number;
  lowStockThreshold: number;
  lastUpdated: Date;
}

export type InventoryCreationAttributes = Optional<
  InventoryAttributes,
  'id' | 'quantity' | 'lowStockThreshold' | 'lastUpdated'
>;

export class Inventory
  extends Model<InventoryAttributes, InventoryCreationAttributes>
  implements InventoryAttributes
{
  declare id: string;
  declare storeId: string;
  declare productId: string;
  declare quantity: number;
  declare lowStockThreshold: number;
  declare lastUpdated: Date;

  /**
   * Model layer — Schema.md §5:
   * "this.quantity += delta; this.lastUpdated = now(); save()"
   * Nếu kết quả < 0 → throw lỗi "Tồn kho không đủ"
   * (dùng trong alt flow của SD-04 bước 9a).
   *
   * Luôn được gọi từ trong transaction có lock ở InventoryService.updateInventory,
   * không gọi trực tiếp method này từ controller.
   */
  async adjustQuantity(delta: number): Promise<Inventory> {
    const newQuantity = this.quantity + delta;
    if (newQuantity < 0) {
      throw new Error('Tồn kho không đủ');
    }
    this.quantity = newQuantity;
    this.lastUpdated = new Date();
    await this.save();
    return this;
  }
}

Inventory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    storeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'stores', key: 'id' },
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'products', key: 'id' },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lowStockThreshold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
    },
    lastUpdated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'inventory',
    timestamps: false, // dùng lastUpdated riêng theo Schema.md, không dùng createdAt/updatedAt mặc định
    indexes: [
      {
        unique: true,
        fields: ['storeId', 'productId'],
      },
    ],
  }
);
