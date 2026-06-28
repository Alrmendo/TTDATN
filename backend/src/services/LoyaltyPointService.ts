// backend/src/services/LoyaltyPointService.ts
//
// Theo Schema.md §11 (`loyalty_points`) — quan hệ 1-1 với `customers`.

import { LoyaltyPoint } from '../models';

export class LoyaltyPointService {
  /**
   * LoyaltyPointService.addPoints(customerId, points): void
   * SD-04 bước 32 — gọi sau khi thanh toán thành công.
   * Nếu chưa có bản ghi loyalty_points cho customer thì tạo mới với points=0 trước.
   */
  static async addPoints(customerId: string, points: number): Promise<void> {
    let record = await LoyaltyPoint.findOne({ where: { customerId } });

    if (!record) {
      record = await LoyaltyPoint.create({ customerId, points: 0 });
    }

    record.points += points;
    record.updatedAt = new Date();
    await record.save();
  }

  /**
   * LoyaltyPointService.redeemPoints(customerId, amount): boolean
   * Trả về false nếu số dư không đủ, không trừ điểm.
   */
  static async redeemPoints(customerId: string, amount: number): Promise<boolean> {
    const record = await LoyaltyPoint.findOne({ where: { customerId } });
    const balance = record?.points ?? 0;

    if (balance < amount) {
      return false;
    }

    record!.points = balance - amount;
    record!.updatedAt = new Date();
    await record!.save();
    return true;
  }

  /**
   * LoyaltyPointService.getBalance(customerId): integer
   */
  static async getBalance(customerId: string): Promise<number> {
    const record = await LoyaltyPoint.findOne({ where: { customerId } });
    return record?.points ?? 0;
  }
}
