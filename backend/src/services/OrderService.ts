// backend/src/services/OrderService.ts
//
// Theo Schema.md §13 (`invoices`) — luồng SD-04 (bán hàng), đúng thứ tự:
// createOrder → addItem → applyPromotion → confirmPayment.
//
// Model/bảng là Invoice/InvoiceDetail (không dùng Order/OrderDetail) —
// tên service layer vẫn giữ OrderService theo Schema.md §13.

import { Invoice, InvoiceDetail, Product, Promotion, Customer } from '../models';
import { Op } from 'sequelize';
import { InventoryService } from './InventoryService';
import { LoyaltyPointService } from './LoyaltyPointService';

export class OrderService {
  /**
   * OrderService.createOrder(storeId, staffId): Invoice
   * SD-04 bước 2-4 — tạo hóa đơn với status='draft'.
   */
  static async createOrder(storeId: string, staffId: string): Promise<Invoice> {
    return Invoice.create({
      storeId,
      staffId,
      status: 'draft',
      paymentStatus: 'pending',
      subtotal: 0,
      discountAmount: 0,
      totalAmount: 0,
    });
  }

  /**
   * OrderService.addItem(invoiceId, productId, qty, storeId): InvoiceDetail
   * SD-04 bước 9 — kiểm tra tồn kho trước (alt flow 9a nếu không đủ),
   * snapshot giá hiện tại của product làm unitPrice, rồi tính lại subtotal hóa đơn.
   *
   * `qty` là số lượng TUYỆT ĐỐI của dòng (không phải delta) — nếu hóa đơn đã có
   * dòng invoice_details cho productId này thì cập nhật tại chỗ (upsert theo
   * invoiceId+productId), không tạo thêm dòng trùng sản phẩm.
   */
  static async addItem(
    invoiceId: string,
    productId: string,
    qty: number,
    storeId: string
  ): Promise<InvoiceDetail> {
    await InventoryService.checkStock(storeId, productId, qty);

    const product = await Product.findByPk(productId);
    if (!product) {
      throw new Error('Không tìm thấy sản phẩm');
    }

    const unitPrice = Number(product.price);
    const subtotal = qty * unitPrice;

    let detail = await InvoiceDetail.findOne({ where: { invoiceId, productId } });

    if (detail) {
      detail.quantity = qty;
      detail.unitPrice = unitPrice;
      detail.subtotal = subtotal;
      await detail.save();
    } else {
      detail = await InvoiceDetail.create({
        invoiceId,
        productId,
        quantity: qty,
        unitPrice,
        subtotal,
      });
    }

    await OrderService.recalculateSubtotal(invoiceId);

    return detail;
  }

  /**
   * OrderService.removeItem(invoiceId, productId): void
   * Xóa dòng invoice_details theo productId, rồi tính lại subtotal hóa đơn.
   */
  static async removeItem(invoiceId: string, productId: string): Promise<void> {
    await InvoiceDetail.destroy({ where: { invoiceId, productId } });
    await OrderService.recalculateSubtotal(invoiceId);
  }

  /**
   * OrderService.setCustomer(invoiceId, customerId): Invoice
   * Gắn khách hàng vào hóa đơn — chỉ cho phép khi hóa đơn còn ở trạng thái 'draft'
   * (chưa thanh toán), để confirmPayment sau đó cộng điểm tích lũy đúng cho khách
   * hàng thật đã chọn, không phải gắn "hồi tố" sau khi đã completed.
   */
  static async setCustomer(invoiceId: string, customerId: string): Promise<Invoice> {
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      throw new Error('Không tìm thấy hóa đơn');
    }
    if (invoice.status !== 'draft') {
      throw new Error('Chỉ có thể gắn khách hàng khi hóa đơn còn ở trạng thái nháp');
    }

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      throw new Error('Không tìm thấy khách hàng');
    }

    invoice.customerId = customerId;
    await invoice.save();
    return invoice;
  }

  /**
   * OrderService.applyPromotion(invoiceId, promotionId): Invoice
   * Promotion.isValid được check trên invoice.subtotal (Schema.md §13).
   * Nếu promotion.productId NULL → giảm trên toàn đơn; ngược lại chỉ giảm
   * trên dòng invoice_details có productId tương ứng (Schema.md §12).
   */
  static async applyPromotion(invoiceId: string, promotionId: string): Promise<Invoice> {
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      throw new Error('Không tìm thấy hóa đơn');
    }

    const promotion = await Promotion.findByPk(promotionId);
    if (!promotion) {
      throw new Error('Không tìm thấy khuyến mãi');
    }

    const subtotal = Number(invoice.subtotal);

    if (!promotion.isValid(subtotal)) {
      // Không hợp lệ — lý do "Không áp dụng được" (Schema.md §13)
      invoice.discountAmount = 0;
      invoice.totalAmount = subtotal;
      await invoice.save();
      return invoice;
    }

    let discountAmount = 0;

    if (promotion.productId === null) {
      discountAmount = promotion.calculateDiscount(subtotal);
    } else {
      const detail = await InvoiceDetail.findOne({
        where: { invoiceId, productId: promotion.productId },
      });
      if (detail) {
        discountAmount = promotion.calculateDiscount(Number(detail.subtotal));
      }
    }

    invoice.discountAmount = discountAmount;
    invoice.totalAmount = subtotal - discountAmount;
    invoice.promotionId = promotionId;
    await invoice.save();

    return invoice;
  }

  /**
   * OrderService.selectBestPromotion(invoiceId): string | null
   * Tự động tìm và chọn KM tốt nhất cho hóa đơn hiện tại.
   *
   * Quy tắc (theo task đã chốt):
   *   1. Lọc tất cả KM đang isActive=true, còn trong [startDate, endDate].
   *   2. Với mỗi KM thỏa điều kiện (minOrderValue / productId match):
   *      - percentage: discount = subtotal × value / 100
   *      - fixed:      discount = value (cố định)
   *   3. Chọn KM có số tiền giảm THỰC TẾ lớn nhất.
   *   4. Trả về promotionId (hoặc null nếu không có KM hợp lệ).
   *
   * Không ghi DB — chỉ đọc Promotion + InvoiceDetail an toàn trước khi gọi applyPromotion.
   */
  static async selectBestPromotion(invoiceId: string): Promise<string | null> {
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) return null;

    const subtotal = Number(invoice.subtotal);
    const now = new Date();

    const activePromos = await Promotion.findAll({
      where: {
        isActive: true,
        startDate: { [Op.lte]: now },
        endDate:   { [Op.gte]: now },
      },
    });
    if (activePromos.length === 0) return null;

    let bestId: string | null = null;
    let bestDiscount = 0;

    for (const promo of activePromos) {
      // isValid() uses explicit Number() coercion internally (promotion.model.ts)
      if (!promo.isValid(subtotal)) continue;

      let discount: number;

      if (promo.productId === null) {
        // calculateDiscount() returns Number — coerce defensively in case of DECIMAL string
        discount = Number(promo.calculateDiscount(subtotal));
      } else {
        // Product-specific promo — only applies to the matching line
        const detail = await InvoiceDetail.findOne({
          where: { invoiceId, productId: promo.productId },
        });
        if (!detail) continue;
        discount = Number(promo.calculateDiscount(Number(detail.subtotal)));
      }

      // Discount cannot exceed the order total
      discount = Math.min(discount, subtotal);
      if (discount <= 0) continue;

      if (discount > bestDiscount) {
        bestDiscount = discount;
        bestId = promo.id;
      }
    }

    return bestId;
  }

  /**
   * OrderService.confirmPayment(invoiceId, method, amount): Invoice
   * SD-04 bước cuối — xác nhận thanh toán, trừ kho qua InventoryService
   * (DÙNG CHUNG, Schema.md §5), cộng điểm thành viên nếu có customerId.
   *
   * Auto-apply: nếu hóa đơn chưa áp KM nào (promotionId == null),
   * hệ thống tự gọi selectBestPromotion → applyPromotion trước khi chốt.
   * Staff không cần chọn tay — nếu có KM tốt hơn Staff đã chọn thì giữ
   * nguyên lựa chọn của Staff (đã có promotionId rồi thì bỏ qua bước này).
   */
  static async confirmPayment(
    invoiceId: string,
    method: string,
    amount: number
  ): Promise<Invoice> {
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      throw new Error('Không tìm thấy hóa đơn');
    }

    if (amount < Number(invoice.totalAmount)) {
      throw new Error('Số tiền không đủ');
    }

    // Auto-apply promotion: nếu chưa có KM nào được áp, tự tìm KM tốt nhất
    if (!invoice.promotionId) {
      const bestPromoId = await OrderService.selectBestPromotion(invoiceId);
      if (bestPromoId) {
        // applyPromotion cập nhật discountAmount + totalAmount trên invoice rồi save —
        // sau đó reload để confirmPayment dùng totalAmount đã được giảm
        await OrderService.applyPromotion(invoiceId, bestPromoId);
        await invoice.reload();
      }
    }

    // Re-check amount sau khi áp KM (totalAmount có thể giảm)
    if (amount < Number(invoice.totalAmount)) {
      throw new Error('Số tiền không đủ');
    }

    invoice.paymentMethod = method;
    invoice.paymentStatus = 'success';
    invoice.paidAt = new Date();
    invoice.status = 'completed';
    await invoice.save();

    const details = await InvoiceDetail.findAll({ where: { invoiceId } });
    for (const detail of details) {
      await InventoryService.updateInventory(
        invoice.storeId,
        detail.productId,
        detail.quantity,
        'decrease'
      );
    }

    if (invoice.customerId) {
      const earnedPoints = Math.floor(Number(invoice.totalAmount) / 10000);
      await LoyaltyPointService.addPoints(invoice.customerId, earnedPoints);
    }

    return invoice;
  }

  /**
   * Tính lại subtotal/totalAmount của hóa đơn từ tổng invoice_details.subtotal
   * — gọi lại sau mỗi addItem/removeItem (Schema.md §13).
   *
   * Guard: nếu hóa đơn đã áp khuyến mãi (promotionId != null hoặc
   * discountAmount > 0), giỏ hàng vừa thay đổi nên discount cũ không còn
   * hợp lệ với subtotal mới — clear về 0 và bắt nhân viên applyPromotion
   * lại từ đầu, tránh treo discountAmount cũ làm sai totalAmount.
   */
  private static async recalculateSubtotal(invoiceId: string): Promise<void> {
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) return;

    const details = await InvoiceDetail.findAll({ where: { invoiceId } });
    const subtotal = details.reduce((sum, d) => sum + Number(d.subtotal), 0);

    invoice.subtotal = subtotal;

    if (invoice.promotionId !== null || Number(invoice.discountAmount) > 0) {
      invoice.promotionId = null;
      invoice.discountAmount = 0;
      invoice.totalAmount = subtotal;
    } else {
      invoice.totalAmount = subtotal - Number(invoice.discountAmount);
    }

    await invoice.save();
  }
}
