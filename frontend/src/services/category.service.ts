import axios from 'axios';
import { API_BASE } from '../config/api';

const API_URL = `${API_BASE}/categories`;

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const getCategories = async () => {
  const res = await axios.get(API_URL, {
    headers: authHeader(),
  });

  return res.data;
};