// backend/src/models/inventory.associations.ts
//
// Khai báo quan hệ N:1 cho Inventory theo Schema.md §5:
//   inventory ──N:1── stores
//   inventory ──N:1── products
//
// LƯU Ý: nếu backend đã có models/index.ts tập trung khai báo association,
// hãy chuyển đoạn này vào đó thay vì giữ file riêng, để tránh associate()
// bị gọi 2 lần (Sequelize sẽ throw lỗi nếu khai báo lặp).

import {Inventory} from './inventory.model';
import { Store } from './store.model';
import { Product } from './product.model';

export function applyInventoryAssociations() {
  Inventory.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });
  Store.hasMany(Inventory, { foreignKey: 'storeId', as: 'inventory' });

  Inventory.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
  Product.hasMany(Inventory, { foreignKey: 'productId', as: 'inventory' });
}
