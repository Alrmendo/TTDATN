// backend/src/controllers/inventoryController.ts

import { Request, Response } from 'express';
import { InventoryService, InventoryServiceError } from '../services/InventoryService';
import { Product } from '../models';
import { Store } from '../models';

/**
 * GET /api/inventory?storeId=
 * Xem tồn kho theo chi nhánh (CD-04, UC-02).
 */
export async function getInventoryByStore(req: Request, res: Response) {
  try {
    const { storeId } = req.query;
    if (!storeId || typeof storeId !== 'string') {
      return res.status(400).json({ message: 'Thiếu hoặc sai tham số storeId' });
    }

    const records = await InventoryService.getStockByStore(storeId);

    // Đính kèm thông tin sản phẩm để hiển thị trên UI Quản lý kho
    const data = await Promise.all(
      records.map(async (r) => {
        const product = await Product.findByPk(r.productId);
        return {
          productId: r.productId,
          productName: product?.get('productName'),
          sku: product?.get('sku'),
          storeId: r.storeId,
          quantity: r.quantity,
          lowStockThreshold: r.lowStockThreshold,
          lastUpdated: r.lastUpdated,
        };
      })
    );

    return res.json({ data });
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * GET /api/inventory/low-stock
 * Sản phẩm sắp hết — dùng cho dashboard.
 * Query param tùy chọn: storeId
 */
export async function getLowStockProducts(req: Request, res: Response) {
  try {
    const storeId = typeof req.query.storeId === 'string' ? req.query.storeId : undefined;
    const records = await InventoryService.checkLowStock(storeId);

    const data = await Promise.all(
      records.map(async (r) => {
        const [product, store] = await Promise.all([
          Product.findByPk(r.productId),
          Store.findByPk(r.storeId),
        ]);
        return {
          productId: r.productId,
          productName: product?.get('productName'),
          sku: product?.get('sku'),
          storeId: r.storeId,
          storeName: store?.get('storeName'),
          quantity: r.quantity,
          lowStockThreshold: r.lowStockThreshold,
        };
      })
    );

    return res.json({ data });
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * PATCH /api/inventory
 * Body: { storeId, productId, quantity, mode }
 * mode: 'increase' | 'decrease'
 *
 * Expose InventoryService.updateInventory ra ngoài — entry point DÙNG CHUNG
 * (Schema.md §5). Chỉ WarehouseStaff được gọi trực tiếp qua UI Quản lý kho
 * (roleMiddleware(['WarehouseStaff']) áp ở route).
 */
export async function updateInventory(req: Request, res: Response) {
  try {
    const { storeId, productId, quantity, mode } = req.body;

    if (!storeId || !productId || !quantity || !mode) {
      return res.status(400).json({ message: 'Thiếu storeId, productId, quantity hoặc mode' });
    }

    const record = await InventoryService.updateInventory(
      storeId,
      productId,
      Number(quantity),
      mode
    );

    return res.json({
      data: {
        productId: record.productId,
        storeId: record.storeId,
        quantity: record.quantity,
        lowStockThreshold: record.lowStockThreshold,
        lastUpdated: record.lastUpdated,
      },
    });
  } catch (err) {
    return handleError(res, err);
  }
}

function handleError(res: Response, err: unknown) {
  if (err instanceof InventoryServiceError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  console.error('[InventoryController]', err);
  return res.status(500).json({ message: 'Lỗi hệ thống' });
}
