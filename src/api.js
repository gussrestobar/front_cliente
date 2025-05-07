import axios from 'axios';

const API_URL = 'https://backend-swqp.onrender.com'; // Cambia esto a la URL de tu backend desplegado

export const getSucursales = () => axios.get(`${API_URL}/sucursales`);
export const getMenus = (sucursalId) => axios.get(`${API_URL}/menus/${sucursalId}`); 