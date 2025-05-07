import axios from 'axios';

const API_URL = '/api';

export const getSucursales = () => {
  return axios.get(`${API_URL}/tenants`);
};

export const getMenus = (tenantId) => {
  return axios.get(`${API_URL}/menu/${tenantId}`);
}; 