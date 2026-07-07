import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Vite proxy will handle this
  withCredentials: true, // Importante para enviar/recibir cookies de sesión de Django
});

export default api;
