import axios from 'axios';

const API_URL = 'http://localhost:5000/api/categories';

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export const getCategories = async () => {
  const res = await axios.get(API_URL, {
    headers: authHeader(),
  });

  return res.data;
};