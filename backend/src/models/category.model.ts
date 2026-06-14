import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class Category extends Model {
  declare id: string;
  declare categoryName: string;
  declare description: string | null;
}

Category.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    categoryName: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    tableName: 'categories',
    timestamps: true,
  }
);
