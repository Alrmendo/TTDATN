import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class Store extends Model {
  declare id: string;
  declare storeName: string;
  declare address: string;
  declare phone: string | null;
  declare isActive: boolean;
}

Store.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    storeName: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    sequelize,
    tableName: 'stores',
    timestamps: true,
  }
);
