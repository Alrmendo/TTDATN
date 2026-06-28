import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export type PurchaseOrderStatus =
  | 'pending'
  | 'completed'
  | 'cancelled';

export class PurchaseOrder extends Model {
  declare id: string;

  declare supplierId: string;
  declare storeId: string;

  declare status: PurchaseOrderStatus;

  declare totalCost: number;

  declare createdBy: string;
  declare confirmedBy: string | null;

  declare createdAt: Date;
  declare confirmedAt: Date | null;
}

PurchaseOrder.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    supplierId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'suppliers',
        key: 'id',
      },
    },

    storeId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'stores',
        key: 'id',
      },
    },

    status: {
      type: DataTypes.ENUM(
        'pending',
        'completed',
        'cancelled'
      ),
      allowNull: false,
      defaultValue: 'pending',
    },

    totalCost: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },

    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },

    confirmedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },

    confirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'purchase_orders',
    updatedAt: false,
  }
);