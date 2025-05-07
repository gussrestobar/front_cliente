import axios from 'axios';

// Configurar la URL base según el entorno
const API_URL = import.meta.env.PROD 
  ? 'https://backend-swqp.onrender.com'
  : import.meta.env.VITE_API_URL || 'https://backend-swqp.onrender.com';

console.log('Entorno:', import.meta.env.PROD ? 'Producción' : 'Desarrollo');
console.log('API URL:', API_URL);

// Configurar axios con las cabeceras por defecto
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['Access-Control-Allow-Origin'] = '*';

export const getSucursales = async () => {
  try {
    console.log('Intentando obtener sucursales...');
    console.log('URL completa:', `${API_URL}/api/tenants`);
    
    const response = await axios.get(`${API_URL}/api/tenants`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      withCredentials: false
    });

    // Verificar si la respuesta es HTML (error)
    if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
      throw new Error('Respuesta inválida del servidor');
    }

    console.log('Datos de sucursales:', response.data);
    return response;
  } catch (error) {
    console.error('Error completo:', error);
    console.error('URL que falló:', `${API_URL}/api/tenants`);
    throw error;
  }
};

export const getMenus = async (tenantId) => {
  try {
    console.log('Obteniendo menú para tenant:', tenantId);
    console.log('URL completa:', `${API_URL}/api/menus/${tenantId}`);
    
    const response = await axios.get(`${API_URL}/api/menus/${tenantId}`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      withCredentials: false
    });

    // Verificar si la respuesta es HTML (error)
    if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
      throw new Error('Respuesta inválida del servidor');
    }

    return response;
  } catch (error) {
    console.error('Error al obtener menús:', error);
    console.error('URL que falló:', `${API_URL}/api/menus/${tenantId}`);
    throw error;
  }
}; 