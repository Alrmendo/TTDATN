import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export class InvoiceDetail extends Model {
  declare id: string;
  declare invoiceId: string;
  declare productId: string;
  declare quantity: number;
  declare unitPrice: number;
  declare subtotal: number;
}

InvoiceDetail.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    invoiceId: { type: DataTypes.UUID, allowNull: false },
    productId: { type: DataTypes.UUID, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    unitPrice: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  },
  {
    sequelize,
    tableName: 'invoice_details',
    timestamps: false,
  }
);
