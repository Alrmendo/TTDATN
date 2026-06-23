import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export type StockTransferStatus = 'pending' | 'completed';

export class StockTransfer extends Model {
  declare id: string;

  declare fromStoreId: string;
  declare toStoreId: string;
  declare productId: string;

  declare quantity: number;

  declare status: StockTransferStatus;

  declare createdBy: string;
  declare confirmedBy: string | null;

  declare createdAt: Date;
  declare confirmedAt: Date | null;
}

StockTransfer.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    fromStoreId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'stores',
        key: 'id',
      },
    },

    toStoreId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'stores',
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

    status: {
      type: DataTypes.ENUM('pending', 'completed'),
      allowNull: false,
      defaultValue: 'pending',
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
    tableName: 'stock_transfers',
    updatedAt: false,
  }
);
