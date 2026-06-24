import { Op, Sequelize } from 'sequelize';
import { Invoice, InvoiceDetail, Inventory, Product, Store } from '../models';

// Inventory.belongsTo(Product/Store) defined with no `as:` alias in
// models/index.ts → default include accessor = model name (PascalCase).
const getProductJoin = (rec: any) => rec.Product ?? rec.product ?? null;
const getStoreJoin = (rec: any) => rec.Store ?? rec.store ?? null;

const ReportService = {
  /**
   * Báo cáo doanh thu trong khoảng [startDate, endDate], lọc theo storeId (optional).
   * Chỉ tính các invoice có status = 'completed'.
   */
  async getRevenueReport(startDate: Date, endDate: Date, storeId?: string) {
    const where: any = {
      status: 'completed',
      createdAt: { [Op.between]: [startDate, endDate] },
    };
    if (storeId) where.storeId = storeId;

    const invoices = await Invoice.findAll({ where, raw: true });

    const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + Number(inv.totalAmount), 0);
    const totalDiscount = invoices.reduce((sum: number, inv: any) => sum + Number(inv.discountAmount), 0);
    const totalSubtotal = invoices.reduce((sum: number, inv: any) => sum + Number(inv.subtotal), 0);
    const totalOrders = invoices.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Gộp doanh thu theo ngày — dùng cho biểu đồ đường trên Dashboard / màn Báo cáo doanh thu
    const dailyMap = new Map<string, number>();
    for (const inv of invoices as any[]) {
      const day = new Date(inv.createdAt).toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + Number(inv.totalAmount));
    }
    const dailyRevenue = Array.from(dailyMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top sản phẩm bán chạy — group theo InvoiceDetail trước, KHÔNG join Product
    // trong cùng câu group-by (tránh phụ thuộc vào alias association cụ thể),
    // rồi map tên sản phẩm lại bằng 1 query Product riêng.
    const invoiceIds = invoices.map((inv: any) => inv.id);
    let topProducts: any[] = [];
    if (invoiceIds.length > 0) {
      const grouped = await InvoiceDetail.findAll({
        attributes: [
          'productId',
          [Sequelize.fn('SUM', Sequelize.col('quantity')), 'totalQuantity'],
          [Sequelize.fn('SUM', Sequelize.col('subtotal')), 'totalRevenue'],
        ],
        where: { invoiceId: { [Op.in]: invoiceIds } },
        group: ['productId'],
        order: [[Sequelize.literal('"totalQuantity"'), 'DESC']],
        limit: 5,
        raw: true,
      });

      const productIds = (grouped as any[]).map((g) => g.productId);
      const products = productIds.length
        ? await Product.findAll({
            where: { id: { [Op.in]: productIds } },
            attributes: ['id', 'productName', 'sku'],
            raw: true,
          })
        : [];
      const productMap = new Map((products as any[]).map((p) => [p.id, p]));

      topProducts = (grouped as any[]).map((g) => ({
        productId: g.productId,
        productName: productMap.get(g.productId)?.productName ?? null,
        sku: productMap.get(g.productId)?.sku ?? null,
        totalQuantity: Number(g.totalQuantity),
        totalRevenue: Number(g.totalRevenue),
      }));
    }

    return {
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      storeId: storeId || null,
      totalRevenue,
      totalDiscount,
      totalSubtotal,
      totalOrders,
      averageOrderValue,
      dailyRevenue,
      topProducts,
    };
  },

  /**
   * Báo cáo tồn kho — lọc theo storeId (optional, không truyền = toàn hệ thống).
   */
  async getInventoryReport(storeId?: string) {
    const where: any = {};
    if (storeId) where.storeId = storeId;

    const records = await Inventory.findAll({
      where,
      include: [
        { model: Product, attributes: ['id', 'productName', 'sku', 'price', 'costPrice', 'isActive'] },
        { model: Store, attributes: ['id', 'storeName'] },
      ],
    });

    let totalStockValue = 0;
    let totalUnits = 0;
    let lowStockCount = 0;

    const items = (records as any[]).map((rec) => {
      const product = getProductJoin(rec);
      const store = getStoreJoin(rec);
      const costPrice = Number(product?.costPrice || 0);
      const stockValue = costPrice * rec.quantity;
      const isLowStock = rec.quantity < rec.lowStockThreshold;

      totalStockValue += stockValue;
      totalUnits += rec.quantity;
      if (isLowStock) lowStockCount += 1;

      return {
        productId: rec.productId,
        productName: product?.productName ?? null,
        sku: product?.sku ?? null,
        storeId: rec.storeId,
        storeName: store?.storeName ?? null,
        quantity: rec.quantity,
        lowStockThreshold: rec.lowStockThreshold,
        isLowStock,
        stockValue,
      };
    });

    return {
      storeId: storeId || null,
      totalProducts: items.length,
      totalUnits,
      totalStockValue,
      lowStockCount,
      items,
    };
  },
};

export default ReportService;
