import axios from 'axios';

const API_URL = 'http://localhost:5000/api/customers';

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
