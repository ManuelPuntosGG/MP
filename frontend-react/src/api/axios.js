import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api', // En local usa el proxy Vite, en Render usa la URL del backend
  withCredentials: true, // Importante para enviar/recibir cookies de sesión de Django
});

export default api;
