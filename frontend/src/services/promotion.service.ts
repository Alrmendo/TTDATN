import axios from 'axios';

const API_URL = 'http://localhost:5000/api/promotions';

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const getPromotions = async () => {
  const res = await axios.get(API_URL, {
    headers: authHeader(),
  });

  return res.data;
};

export const createPromotion = async (
  data: unknown
) => {
  const res = await axios.post(
    API_URL,
    data,
    {
      headers: authHeader(),
    }
  );

  return res.data;
};

export const deactivatePromotion = async (
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

export const updatePromotion = async (
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