import axios from 'axios';

const API_URL = 'https://backend-swqp.onrender.com/api'; // Asegúrate de que la ruta sea correcta

export const getSucursales = () => axios.get(`${API_URL}/sucursales`);
export const getMenus = (sucursalId) => axios.get(`${API_URL}/menus/${sucursalId}`); 