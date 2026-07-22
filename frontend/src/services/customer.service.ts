import axios from 'axios';
import { API_BASE } from '../config/api';

const API_URL = `${API_BASE}/customers`;

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const searchCustomers = async (q?: string) => {
  const res = await axios.get(API_URL, {
    headers: authHeader(),
    params: q ? { q } : undefined,
  });

  return res.data;
};

export const createCustomer = async (data: unknown) => {
  const res = await axios.post(API_URL, data, {
    headers: authHeader(),
  });

  return res.data;
};

export const updateCustomer = async (id: string, data: unknown) => {
  const res = await axios.put(`${API_URL}/${id}`, data, {
    headers: authHeader(),
  });
  return res.data;
};
