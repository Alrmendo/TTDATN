export class DateRangeError extends Error {
  constructor(message: string = 'Khoảng thời gian không hợp lệ') {
    super(message);
    this.name = 'DateRangeError';
  }
}

export interface ParsedDateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Parse + validate startDate/endDate từ query string.
 * - Bắt buộc cả 2 đều có mặt và là ngày hợp lệ (ISO 'YYYY-MM-DD' hoặc datetime ISO).
 * - startDate phải <= endDate.
 * - endDate được hiểu là "đến hết ngày đó" (set giờ về 23:59:59.999) để khi
 *   lọc theo invoices.createdAt không bị thiếu dữ liệu của chính ngày endDate.
 */
export function parseAndValidateDateRange(
  startDateRaw: unknown,
  endDateRaw: unknown
): ParsedDateRange {
  if (typeof startDateRaw !== 'string' || typeof endDateRaw !== 'string' || !startDateRaw || !endDateRaw) {
    throw new DateRangeError('Khoảng thời gian không hợp lệ');
  }

  const startDate = new Date(startDateRaw);
  const endDate = new Date(endDateRaw);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new DateRangeError('Khoảng thời gian không hợp lệ');
  }

  if (startDate.getTime() > endDate.getTime()) {
    throw new DateRangeError('Khoảng thời gian không hợp lệ');
  }

  // Đẩy endDate tới cuối ngày để bao trùm toàn bộ ngày đó
  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);

  return { startDate, endDate: endOfDay };
}
