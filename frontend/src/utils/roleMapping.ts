import { AuthUser } from '../types';

export const roleLabels: Record<AuthUser['role'], 'Quản lý' | 'Nhân viên bán hàng' | 'Nhân viên kho'> = {
  Manager: 'Quản lý',
  Staff: 'Nhân viên bán hàng',
  WarehouseStaff: 'Nhân viên kho',
};

export const roleLabelToEnum: Record<'Quản lý' | 'Nhân viên bán hàng' | 'Nhân viên kho', AuthUser['role']> = {
  'Quản lý': 'Manager',
  'Nhân viên bán hàng': 'Staff',
  'Nhân viên kho': 'WarehouseStaff',
};

export const defaultTabByRole: Record<AuthUser['role'], string> = {
  Manager: 'Tổng quan',
  Staff: 'Bán hàng',
  WarehouseStaff: 'Tồn kho',
};
