import axios from 'axios';
import { API_BASE } from '../config/api';
import { Category } from '../types';

const API_URL = `${API_BASE}/categories`;

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const getCategories = async () => {
  const res = await axios.get<Category[]>(API_URL, {
    headers: authHeader(),
  });

  return res.data;
};

export const createCategory = async (payload: { categoryName: string; description?: string | null }) => {
  const res = await axios.post<Category>(API_URL, payload, {
    headers: authHeader(),
  });

  return res.data;
};

export const updateCategory = async (
  id: string,
  payload: { categoryName: string; description?: string | null }
) => {
  const res = await axios.put<Category>(`${API_URL}/${id}`, payload, {
    headers: authHeader(),
  });

  return res.data;
};