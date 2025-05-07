import axios from 'axios';

// Configuración de axios
const API_URL = import.meta.env.PROD 
  ? 'https://backend-swqp.onrender.com'
  : 'http://localhost:3000';

console.log('API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true
});

// Interceptor para logging
api.interceptors.request.use(request => {
  console.log('Iniciando petición:', request.url);
  return request;
});

api.interceptors.response.use(
  response => {
    console.log('Respuesta recibida:', response.status);
    return response;
  },
  error => {
    console.error('Error en la petición:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// Funciones para obtener datos
export const fetchBranches = async () => {
  try {
    console.log('Intentando obtener sucursales...');
    const response = await api.get('/api/tenants');
    console.log('Datos de sucursales:', response.data);
    
    if (!Array.isArray(response.data)) {
      console.error('La respuesta no es un array:', response.data);
      throw new Error('Formato de respuesta inválido');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error al obtener sucursales:', error);
    throw error;
  }
};

export const fetchMenu = async (tenantId) => {
  try {
    const response = await api.get(`/api/menu/${tenantId}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener el menú:', error);
    throw error;
  }
};

export const fetchCategories = async (tenantId) => {
  try {
    const response = await api.get(`/api/categorias/${tenantId}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    throw error;
  }
};

export const fetchReservations = async (tenantId) => {
  try {
    const response = await api.get(`/api/reservas/${tenantId}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    throw error;
  }
};

export const createReservation = async (reservationData) => {
  try {
    const response = await api.post('/api/reservas', reservationData);
    return response.data;
  } catch (error) {
    console.error('Error al crear reserva:', error);
    throw error;
  }
};

export const fetchAvailableTables = async (tenantId, date, time) => {
  try {
    const response = await api.get(`/api/mesas/disponibles/${tenantId}`, {
      params: { date, time }
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener mesas disponibles:', error);
    throw error;
  }
}; 