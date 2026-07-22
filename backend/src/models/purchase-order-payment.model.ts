import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class PurchaseOrderPayment extends Model {
  declare id: string;
  declare purchaseOrderId: string;
  declare amount: number;
  declare paidAt: Date;
  declare userId: string;
}

PurchaseOrderPayment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    purchaseOrderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'purchase_orders', key: 'id' },
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
  },
  {
    sequelize,
    tableName: 'purchase_order_payments',
    timestamps: false,
  }
);