import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class LoyaltyPoint extends Model {
  declare id: string;
  declare customerId: string;
  declare points: number;
  declare updatedAt: Date;
}

LoyaltyPoint.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    customerId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: 'customers', key: 'id' },
    },
    points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'loyalty_points',
    timestamps: false,
  }
);
