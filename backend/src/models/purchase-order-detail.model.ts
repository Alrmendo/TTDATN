import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class PurchaseOrderDetail extends Model {
  declare id: string;

  declare purchaseOrderId: string;

  declare productId: string;

  declare quantity: number;

  declare receivedQuantity: number | null;

  declare unitCost: number;

  getSubtotal(): number {
    return this.quantity * Number(this.unitCost);
  }
}

PurchaseOrderDetail.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    purchaseOrderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'purchase_orders',
        key: 'id',
      },
    },

    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id',
      },
    },

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    receivedQuantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    unitCost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'purchase_order_details',
    timestamps: false,
  }
);