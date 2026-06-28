import axios from 'axios';

const API_URL = 'http://localhost:5000/api/stock-transfers';

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export interface StockTransferProduct {
  id: string;
  productName: string;
  sku: string;
}

export interface StockTransferStore {
  id: string;
  storeName: string;
}

export interface StockTransferUser {
  id: string;
  fullName: string;
  email: string;
}

export interface StockTransfer {
  id: string;
  fromStoreId: string;
  toStoreId: string;
  productId: string;
  quantity: number;
  status: 'pending' | 'completed';
  createdBy: string;
  confirmedBy: string | null;
  createdAt: string;
  confirmedAt: string | null;
  fromStore: StockTransferStore;
  toStore: StockTransferStore;
  product: StockTransferProduct;
  creator: StockTransferUser;
}

export interface GetTransfersParams {
  status?: 'pending' | 'completed';
  storeId?: string;
}

export interface CreateTransferData {
  fromStoreId: string;
  toStoreId: string;
  productId: string;
  quantity: number;
}

export const getTransfers = async (
  params?: GetTransfersParams
): Promise<StockTransfer[]> => {
  const res = await axios.get(API_URL, {
    headers: authHeader(),
    params,
  });

  return res.data;
};

export const createTransfer = async (
  data: CreateTransferData
): Promise<StockTransfer> => {
  const res = await axios.post(
    API_URL,
    data,
    {
      headers: authHeader(),
    }
  );

  return res.data;
};

export const confirmTransfer = async (
  transferId: string
): Promise<StockTransfer> => {
  const res = await axios.put(
    `${API_URL}/${transferId}/confirm`,
    {},
    {
      headers: authHeader(),
    }
  );

  return res.data;
};
