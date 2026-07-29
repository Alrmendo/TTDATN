import axios from 'axios';
import { API_BASE } from '../config/api';
import { ApiAccount } from '../types';

const API_URL = `${API_BASE}/accounts`;
const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const getAccounts = () =>
  axios.get<ApiAccount[]>(API_URL, { headers: authHeader() });
