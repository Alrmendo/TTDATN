// CONFIRMED from your models/index.ts that inventory.model.ts already exists
// and exports `{ Inventory }`, with associations
// (Inventory.belongsTo(Store), Inventory.belongsTo(Product) — no alias)
// registered centrally in index.ts, NOT inside this file. This reference
// matches that pattern — only use it to reconcile field names if your real
// file's columns differ (e.g. if `lowStockThreshold`/`lastUpdated` are named
// differently, or `adjustQuantity` isn't implemented yet per the README).

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface InventoryAttributes {
  id: string;
  storeId: string;
  productId: string;
  quantity: number;
  lowStockThreshold: number;
  lastUpdated: Date;
}

type InventoryCreationAttributes = Optional<
  InventoryAttributes,
  'id' | 'quantity' | 'lowStockThreshold' | 'lastUpdated'
>;

class Inventory
  extends Model<InventoryAttributes, InventoryCreationAttributes>
  implements InventoryAttributes
{
  public id!: string;
  public storeId!: string;
  public productId!: string;
  public quantity!: number;
  public lowStockThreshold!: number;
  public lastUpdated!: Date;

  /**
   * Cộng/trừ trực tiếp số lượng — theo Schema.md mục 5.
   * Throw "Tồn kho không đủ" nếu kết quả < 0 (dùng trong SD-04 alt flow 9a).
   * Method DUY NHẤT được phép ghi `quantity` — luôn gọi qua
   * InventoryService.updateInventory(), không gọi trực tiếp từ controller.
   */
  public async adjustQuantity(delta: number): Promise<void> {
    const next = this.quantity + delta;
    if (next < 0) {
      throw new Error('Tồn kho không đủ');
    }
    this.quantity = next;
    this.lastUpdated = new Date();
    await this.save();
  }
}

Inventory.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    storeId: { type: DataTypes.UUID, allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lowStockThreshold: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
    lastUpdated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'Inventory',
    tableName: 'inventory',
    timestamps: false,
    indexes: [{ unique: true, fields: ['storeId', 'productId'] }],
  }
);

// NOTE: associations (belongsTo Store/Product) are registered in models/index.ts,
// not here — keep it that way, don't duplicate them in this file.

export { Inventory };
