import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class Customer extends Model {
  declare id: string;
  declare fullName: string;
  declare phone: string;
  declare email: string | null;
  declare address: string | null;
  declare memberLevel: string | null;
  declare createdAt: Date;
}

Customer.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    fullName: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false, unique: true },
    email: { type: DataTypes.STRING, allowNull: true },
    address: { type: DataTypes.STRING, allowNull: true },
    memberLevel: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    tableName: 'customers',
    timestamps: true,
    updatedAt: false,
  }
);
