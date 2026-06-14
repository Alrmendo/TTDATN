import { sequelize } from '../config/database';
import { User } from './user.model';
import { Store } from './store.model';

// Associations
User.belongsTo(Store, { foreignKey: 'storeId' });
Store.hasMany(User, { foreignKey: 'storeId' });

export const syncDatabase = async () => {
  await sequelize.sync({ alter: true }); // alter: true tự sửa table theo model, KHÔNG xóa data
  console.log('✅ Database synced');
};

export { User, Store };
