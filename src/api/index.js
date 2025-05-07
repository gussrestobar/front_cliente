import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const getSucursales = async () => {
  try {
    console.log('Intentando obtener sucursales...');
    const response = await axios.get(`${API_URL}/api/tenants`);
    console.log('Datos de sucursales:', response.data);
    return response;
  } catch (error) {
    console.error('Error completo:', error);
    throw error;
  }
};

export const getMenus = async (tenantId) => {
  try {
    const response = await axios.get(`${API_URL}/api/menus/${tenantId}`);
    return response;
  } catch (error) {
    console.error('Error al obtener menús:', error);
    throw error;
  }
}; 