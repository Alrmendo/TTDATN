import { Request, Response } from 'express';
import { Op } from 'sequelize';
import bcrypt from 'bcrypt';
import { User } from '../models';

const VALID_ROLES = ['Manager', 'Staff', 'WarehouseStaff'] as const;
type UserRole = (typeof VALID_ROLES)[number];

export const listAccounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, role, storeId } = req.query as Record<string, string | undefined>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (search) {
      where[Op.or] = [
        { fullName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (role) where.role = role;
    if (storeId) where.storeId = storeId;

    const users = await User.findAll({
      where,
      attributes: { exclude: ['passwordHash'] },
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json(users);
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

export const createAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, email, password, role, storeId, phone, salary } = req.body as {
      fullName?: string;
      email?: string;
      password?: string;
      role?: string;
      storeId?: string;
      phone?: string;
      salary?: number;
    };

    if (!fullName || !email || !password || !role) {
      res.status(400).json({ message: 'fullName, email, mật khẩu và role là bắt buộc' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
      return;
    }

    if (!VALID_ROLES.includes(role as UserRole)) {
      res.status(400).json({ message: 'Role không hợp lệ. Chỉ chấp nhận: Manager, Staff, WarehouseStaff' });
      return;
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      res.status(409).json({ message: 'Tài khoản đã tồn tại' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      email,
      passwordHash,
      role: role as UserRole,
      storeId: storeId ?? null,
      phone: phone ?? null,
      salary: salary ?? null,
      isActive: true,
    });

    const { passwordHash: _ph, ...userWithoutHash } = user.toJSON() as Record<string, unknown>;
    res.status(201).json(userWithoutHash);
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

export const updateAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { fullName, phone, storeId, salary, isActive } = req.body as {
      fullName?: string;
      phone?: string;
      storeId?: string;
      salary?: number;
      isActive?: boolean;
    };

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({ message: 'Không tìm thấy tài khoản' });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (fullName !== undefined) updates.fullName = fullName;
    if (phone !== undefined) updates.phone = phone;
    if (storeId !== undefined) updates.storeId = storeId;
    if (salary !== undefined) updates.salary = salary;
    if (isActive !== undefined) updates.isActive = isActive;

    await user.update(updates);

    const { passwordHash: _ph, ...userWithoutHash } = user.toJSON() as Record<string, unknown>;
    res.status(200).json(userWithoutHash);
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};
