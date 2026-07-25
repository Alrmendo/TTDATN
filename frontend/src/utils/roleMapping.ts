import { AuthUser } from '../types';

export const roleLabels: Record<AuthUser['role'], 'Quản lý' | 'Nhân viên bán hàng' | 'Nhân viên kho' | 'Quản lý chi nhánh'> = {
  Manager: 'Quản lý',
  Staff: 'Nhân viên bán hàng',
  WarehouseStaff: 'Nhân viên kho',
  BranchManager: 'Quản lý chi nhánh',
};

export const roleLabelToEnum: Record<'Quản lý' | 'Nhân viên bán hàng' | 'Nhân viên kho' | 'Quản lý chi nhánh', AuthUser['role']> = {
  'Quản lý': 'Manager',
  'Nhân viên bán hàng': 'Staff',
  'Nhân viên kho': 'WarehouseStaff',
  'Quản lý chi nhánh': 'BranchManager',
};

export const defaultTabByRole: Record<AuthUser['role'], string> = {
  Manager: 'Tổng quan',
  Staff: 'Bán hàng',
  WarehouseStaff: 'Tồn kho',
  BranchManager: 'Đơn nhập hàng',
};
