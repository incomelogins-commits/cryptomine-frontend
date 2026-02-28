import axios from 'axios';

const BASE_URL = 'https://cryptomine-backend-production.up.railway.app';

const api = axios.create({ baseURL: BASE_URL });

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
};

export const miningAPI = {
  getStats: () => api.get('/api/mining/stats'),
  startSession: (data) => api.post('/api/mining/session', data),
  triggerJackpot: () => api.post('/api/mining/jackpot/trigger'),
  getTransactions: () => api.get('/api/mining/transactions'),
};

export const walletAPI = {
  withdraw: (amount) => api.post('/api/wallet/withdraw', { amount }),
  connectWallet: (address) => api.post('/api/wallet/connect', { address }),
};

export const supportAPI = {
  createRequest: (data) => api.post('/api/support/request', data),
};

export default api;
