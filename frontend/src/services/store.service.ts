import axios from 'axios';

const API_URL = 'http://localhost:5000/api/stores';
const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const getStores = () =>
  axios.get(API_URL, { headers: authHeader() });

export const createStore = (data: { storeName: string; address: string; phone?: string }) =>
  axios.post(API_URL, data, { headers: authHeader() });

export const updateStore = (id: string, data: { storeName?: string; address?: string; phone?: string }) =>
  axios.put(`${API_URL}/${id}`, data, { headers: authHeader() });

export const deactivateStore = (id: string) =>
  axios.put(`${API_URL}/${id}/deactivate`, {}, { headers: authHeader() });
