import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class User extends Model {
  declare id: string;
  declare fullName: string;
  declare email: string;
  declare passwordHash: string;
  declare phone: string | null;
  declare role: 'Manager' | 'Staff' | 'WarehouseStaff';
  declare storeId: string | null;
  declare salary: number | null;
  declare isActive: boolean;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    fullName: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: true },
    role: {
      type: DataTypes.ENUM('Manager', 'Staff', 'WarehouseStaff'),
      allowNull: false,
    },
    storeId: { type: DataTypes.UUID, allowNull: true },
    salary: { type: DataTypes.DECIMAL, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true, // tự tạo createdAt, updatedAt
  }
);