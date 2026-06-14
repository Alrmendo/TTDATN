import { sequelize } from '../config/database';
import { User } from './user.model';

// Khi có thêm model Store, Product... thì import và define association ở đây
// Ví dụ: User.belongsTo(Store, { foreignKey: 'storeId' });

export const syncDatabase = async () => {
  await sequelize.sync({ alter: true }); // alter: true tự sửa table theo model, KHÔNG xóa data
  console.log('✅ Database synced');
};

export { User };