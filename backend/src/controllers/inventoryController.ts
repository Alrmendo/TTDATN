import { Request, Response } from 'express';
import InventoryService, { InventoryError } from '../services/inventoryService';

/**
 * GET /api/inventory?storeId=
 * - Manager: phải truyền storeId (xem tồn kho theo từng chi nhánh cụ thể)
 * - WarehouseStaff: luôn bị ép về storeId của chính mình (req.user.storeId),
 *   bỏ qua query param nếu có truyền khác — tránh xem chéo tồn kho chi nhánh khác.
 */
export const getInventoryByStore = async (req: Request, res: Response) => {
  try {
    let storeId = req.query.storeId as string | undefined;

    if (req.user?.role === 'WarehouseStaff') {
      storeId = req.user.storeId ?? undefined;
    }

    if (!storeId) {
      return res.status(400).json({ message: 'storeId là bắt buộc' });
    }

    const data = await InventoryService.getStockByStore(storeId);
    return res.json(data);
  } catch (err) {
    if (err instanceof InventoryError) {
      return res.status(err.status).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Lỗi server', error: (err as Error).message });
  }
};

/**
 * GET /api/inventory/low-stock?storeId=
 * - storeId optional với Manager (không truyền = quét toàn hệ thống, dùng cho dashboard)
 * - WarehouseStaff luôn bị ép về storeId của chính mình
 */
export const getLowStockProducts = async (req: Request, res: Response) => {
  try {
    let storeId = req.query.storeId as string | undefined;

    if (req.user?.role === 'WarehouseStaff') {
      storeId = req.user.storeId ?? undefined;
    }

    const data = await InventoryService.checkLowStock(storeId);
    return res.json(data);
  } catch (err) {
    if (err instanceof InventoryError) {
      return res.status(err.status).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Lỗi server', error: (err as Error).message });
  }
};

/**
 * PUT /api/inventory/:productId
 * Body: { storeId, quantity }  — đặt tồn kho về một số TUYỆT ĐỐI
 * (dùng cho màn "Điều chỉnh số lượng kho" / nút "Cập nhật" trong WarehouseManagement).
 *
 * Quan trọng: vẫn KHÔNG tạo signature mới ở service layer. Controller tự tính
 * delta = quantity_mới - quantity_hiện_tại, rồi gọi InventoryService.updateInventory()
 * — method DUY NHẤT được phép thay đổi tồn kho (Schema.md mục 5).
 */
export const setInventoryQuantity = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    let { storeId, quantity } = req.body as { storeId?: string; quantity?: number };

    if (req.user?.role === 'WarehouseStaff') {
      storeId = req.user.storeId ?? undefined;
    }

    if (!storeId) {
      return res.status(400).json({ message: 'storeId là bắt buộc' });
    }

    const targetQty = Number(quantity);
    if (!Number.isFinite(targetQty) || targetQty < 0 || !Number.isInteger(targetQty)) {
      return res.status(400).json({ message: 'quantity phải là số nguyên không âm' });
    }

    const current = await InventoryService.getInventoryRecord(storeId, productId as string);
    const currentQty = current?.quantity ?? 0;
    const delta = targetQty - currentQty;

    let result;
    if (delta > 0) {
      result = await InventoryService.updateInventory(storeId, productId as string, delta, 'increase');
    } else if (delta < 0) {
      result = await InventoryService.updateInventory(storeId, productId as string, Math.abs(delta), 'decrease');
    } else {
      // Không có thay đổi thực tế — trả lại bản ghi hiện có (hoặc 0 nếu chưa từng tồn tại)
      result = current ?? {
        storeId,
        productId,
        quantity: 0,
        lowStockThreshold: 10,
        lastUpdated: new Date(),
      };
    }

    return res.json(result);
  } catch (err) {
    if (err instanceof InventoryError) {
      return res.status(err.status).json({ message: err.message });
    }
    return res.status(500).json({ message: 'Lỗi server', error: (err as Error).message });
  }
};
