import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      res.status(400).json({ message: 'Email và mật khẩu là bắt buộc' });
      return;
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
      return;
    }

    if (user.isActive === false) {
      res.status(403).json({ message: 'Tài khoản đã bị vô hiệu hóa' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, storeId: user.storeId },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        storeId: user.storeId,
      },
    });
  } catch {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};
