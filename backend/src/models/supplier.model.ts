import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class Supplier extends Model {
  declare id: string;
  declare supplierName: string;
  declare contactInfo: string | null;
  declare createdAt: Date;
}

Supplier.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    supplierName: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    contactInfo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'suppliers',
    updatedAt: false,
  }
);