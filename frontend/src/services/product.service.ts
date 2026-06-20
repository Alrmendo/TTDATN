import axios from 'axios';

const API_URL = 'http://localhost:5000/api/products';

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const getProducts = async () => {
  const res = await axios.get(API_URL, {
    headers: authHeader(),
  });

  return res.data;
};

export const createProduct = async (data: unknown) => {
  const res = await axios.post(API_URL, data, {
    headers: authHeader(),
  });

  return res.data;
};

export const updateProduct = async (
  id: string,
  data: unknown
) => {
  const res = await axios.put(
    `${API_URL}/${id}`,
    data,
    {
      headers: authHeader(),
    }
  );

  return res.data;
};

export const deleteProduct = async (
  id: string
) => {
  const res = await axios.delete(
    `${API_URL}/${id}`,
    {
      headers: authHeader(),
    }
  );

  return res.data;
};

export const searchProducts = async (
  q: string
) => {
  const res = await axios.get(
    `${API_URL}/search?q=${encodeURIComponent(q)}`,
    {
      headers: authHeader(),
    }
  );

  return res.data;
};