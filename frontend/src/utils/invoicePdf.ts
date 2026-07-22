import jsPDF from 'jspdf';
import type { ApiInvoice, ApiInvoiceDetail } from '../types';

const removeVietnameseAccents = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

const text = (value: string): string => removeVietnameseAccents(value);

const formatCurrency = (value: number): string =>
  `${new Intl.NumberFormat('en-US').format(value)} VND`;

const getProductName = (detail: ApiInvoiceDetail): string =>
  detail.product?.productName || detail.product?.sku || detail.productId;

/** Generate and download a PDF containing only the selected invoice. */
export function downloadInvoicePdf(invoice: ApiInvoice): void {
  const pdf = new jsPDF({ unit: 'mm', format: 'a5' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = 16;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(text('RETAIL CHAIN INVOICE'), pageWidth / 2, y, { align: 'center' });
  y += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(text(`Invoice: ${invoice.id}`), 15, y);
  y += 5;
  pdf.text(text(`Date: ${new Date(invoice.createdAt).toLocaleString('en-GB')}`), 15, y);
  y += 8;

  pdf.setFont('helvetica', 'bold');
  pdf.text(text('Customer'), 15, y);
  pdf.setFont('helvetica', 'normal');
  pdf.text(text(invoice.customer?.fullName || 'Walk-in customer'), 45, y);
  y += 7;

  pdf.setDrawColor(210, 210, 210);
  pdf.line(15, y, pageWidth - 15, y);
  y += 7;

  pdf.setFont('helvetica', 'bold');
  const qtyX = 105;
  const amountX = pageWidth - 15;
  pdf.text(text('Product'), 15, y);
  pdf.text(text('Qty'), qtyX, y, { align: 'center' });
  pdf.text(text('Amount'), amountX, y, { align: 'right' });
  y += 5;
  pdf.setFont('helvetica', 'normal');

  for (const detail of invoice.invoiceDetails ?? []) {
    // Keep the product column away from Qty; long names wrap before reaching it.
    const name = pdf.splitTextToSize(text(getProductName(detail)), 78) as string[];
    pdf.text(name, 15, y);
    pdf.text(String(detail.quantity), qtyX, y, { align: 'center' });
    pdf.text(formatCurrency(Number(detail.subtotal)), amountX, y, { align: 'right' });
    y += Math.max(5, name.length * 4.5);
  }

  y += 3;
  pdf.line(15, y, pageWidth - 15, y);
  y += 7;
  pdf.text(text('Subtotal'), 95, y);
  pdf.text(formatCurrency(Number(invoice.subtotal)), amountX, y, { align: 'right' });
  y += 6;
  pdf.text(text('Discount'), 95, y);
  pdf.text(`-${formatCurrency(Number(invoice.discountAmount))}`, amountX, y, { align: 'right' });
  y += 8;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(text('TOTAL'), 95, y);
  pdf.text(formatCurrency(Number(invoice.totalAmount)), amountX, y, { align: 'right' });
  y += 10;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(text(`Payment: ${invoice.paymentMethod || 'N/A'}`), 15, y);
  y += 10;
  pdf.text(text('Thank you for shopping with us!'), pageWidth / 2, y, { align: 'center' });

  pdf.save(`invoice-${invoice.id.slice(0, 8)}.pdf`);
}
