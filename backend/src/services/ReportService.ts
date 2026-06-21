// backend/src/services/ReportService.ts
//
// Module: Báo cáo (SD-06, UC-04). Phụ trách bởi "Người 3 (Tồn kho & Báo cáo)"
// theo Schema.md — cùng người với module Tồn kho, nên tái dùng quy ước
// validate + style response đã thống nhất ở InventoryService.
//
// Công thức:
// - Doanh thu: chỉ tính invoices.status = 'completed' (đơn đã chốt thật,
//   không tính draft/cancelled), tổng theo invoices.totalAmount.
//   Lọc theo invoices.createdAt trong [startDate, endOfDay(endDate)].
// - Giá trị tồn kho: inventory.quantity * products.costPrice
//   (Schema.md §4: "costPrice — giá nhập — dùng cho báo cáo tồn kho (SD-06)").

import { Op } from 'sequelize';
import { sequelize } from '../config/database';
import { Invoice } from '../models';
import { Inventory } from '../models/Inventory';
import { Product } from '../models';
import { Store } from '../models';
import {
  parseAndValidateDateRange,
  DateRangeError,
} from '../utils/dateRangeValidator';

export { DateRangeError };

export interface RevenueByDay {
  date: string; // 'YYYY-MM-DD'
  revenue: number;
  orderCount: number;
}

export interface RevenueByStore {
  storeId: string;
  storeName: string;
  revenue: number;
  orderCount: number;
  percentage: number; // % trên totalRevenue, đã round
}

export interface RevenueReport {
  startDate: string;
  endDate: string;
  storeId: string | null;
  totalRevenue: number;
  totalOrders: number;
  byDay: RevenueByDay[];
  byStore: RevenueByStore[];
}

export interface InventoryReportItem {
  productId: string;
  productName: string;
  sku: string;
  storeId: string;
  quantity: number;
  lowStockThreshold: number;
  costPrice: number;
  stockValue: number; // quantity * costPrice
}

export interface InventoryReportSummary {
  totalSkuCount: number;
  totalStockValue: number;
  lowStockCount: number;
}

export interface InventoryReport {
  storeId: string | null;
  summary: InventoryReportSummary;
  items: InventoryReportItem[];
}

export class ReportService {
  /**
   * GET /reports/revenue?startDate=&endDate=&storeId=
   *
   * @param startDateRaw query string startDate (bắt buộc)
   * @param endDateRaw   query string endDate (bắt buộc)
   * @param storeId      lọc theo chi nhánh — nếu không truyền, tính toàn hệ thống
   */
  static async getRevenueReport(
    startDateRaw: unknown,
    endDateRaw: unknown,
    storeId?: string
  ): Promise<RevenueReport> {
    // Validate: startDate <= endDate — throw DateRangeError('Khoảng thời gian không hợp lệ') nếu sai
    const { startDate, endDate } = parseAndValidateDateRange(startDateRaw, endDateRaw);

    const where: Record<string, unknown> = {
      status: 'completed',
      createdAt: { [Op.between]: [startDate, endDate] },
    };
    if (storeId) {
      where.storeId = storeId;
    }

    const invoices = await Invoice.findAll({
      where,
      attributes: ['id', 'storeId', 'totalAmount', 'createdAt'],
      order: [['createdAt', 'ASC']],
    });

    const byDayMap = new Map<string, { revenue: number; orderCount: number }>();
    const byStoreMap = new Map<string, { revenue: number; orderCount: number }>();
    let totalRevenue = 0;

    for (const inv of invoices) {
      const dayKey = toDateKey(inv.createdAt);
      const amount = Number(inv.totalAmount);
      totalRevenue += amount;

      const existingDay = byDayMap.get(dayKey);
      if (existingDay) {
        existingDay.revenue += amount;
        existingDay.orderCount += 1;
      } else {
        byDayMap.set(dayKey, { revenue: amount, orderCount: 1 });
      }

      const existingStore = byStoreMap.get(inv.storeId);
      if (existingStore) {
        existingStore.revenue += amount;
        existingStore.orderCount += 1;
      } else {
        byStoreMap.set(inv.storeId, { revenue: amount, orderCount: 1 });
      }
    }

    const byDay: RevenueByDay[] = Array.from(byDayMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, v]) => ({ date, revenue: v.revenue, orderCount: v.orderCount }));

    const byStore: RevenueByStore[] = await Promise.all(
      Array.from(byStoreMap.entries()).map(async ([sId, v]) => {
        const store = await Store.findByPk(sId);
        return {
          storeId: sId,
          storeName: String(store?.get('storeName') ?? ''),
          revenue: v.revenue,
          orderCount: v.orderCount,
          percentage: totalRevenue > 0 ? Math.round((v.revenue / totalRevenue) * 100) : 0,
        };
      })
    );
    byStore.sort((a, b) => b.revenue - a.revenue);

    return {
      startDate: toDateKey(startDate),
      endDate: toDateKey(endDate),
      storeId: storeId ?? null,
      totalRevenue,
      totalOrders: invoices.length,
      byDay,
      byStore,
    };
  }

  /**
   * GET /reports/inventory?storeId=
   * Không bắt buộc storeId — nếu không truyền, báo cáo toàn hệ thống.
   */
  static async getInventoryReport(storeId?: string): Promise<InventoryReport> {
    const where: Record<string, unknown> = {};
    if (storeId) {
      where.storeId = storeId;
    }

    const records = await Inventory.findAll({ where });

    const items: InventoryReportItem[] = await Promise.all(
      records.map(async (r) => {
        const product = await Product.findByPk(r.productId);
        const costPrice = Number(product?.get('costPrice') ?? 0);
        return {
          productId: r.productId,
          productName: String(product?.get('productName') ?? ''),
          sku: String(product?.get('sku') ?? ''),
          storeId: r.storeId,
          quantity: r.quantity,
          lowStockThreshold: r.lowStockThreshold,
          costPrice,
          stockValue: r.quantity * costPrice,
        };
      })
    );

    const summary: InventoryReportSummary = {
      totalSkuCount: items.length,
      totalStockValue: items.reduce((sum, i) => sum + i.stockValue, 0),
      lowStockCount: items.filter((i) => i.quantity < i.lowStockThreshold).length,
    };

    return {
      storeId: storeId ?? null,
      summary,
      items,
    };
  }
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
