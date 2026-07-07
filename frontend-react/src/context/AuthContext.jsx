import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState({ pedidos_catalogo: [], ordenes: [], importaciones: [] });
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await api.get('/user/');
      if (res.data.authenticated) {
        setUser(res.data.user);
        setOrders({
          pedidos_catalogo: res.data.pedidos_catalogo || [],
          ordenes: res.data.ordenes || [],
          importaciones: res.data.importaciones || []
        });
      } else {
        setUser(null);
        setOrders({ pedidos_catalogo: [], ordenes: [], importaciones: [] });
      }
    } catch (error) {
      console.error('Error fetching user status:', error);
      setUser(null);
      setOrders({ pedidos_catalogo: [], ordenes: [], importaciones: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const loginUser = async (email, password) => {
    try {
      const res = await api.post('/login/', { email, password });
      if (res.data.success) {
        await fetchUser();
        return { success: true };
      }
      return { success: false, error: 'Credenciales incorrectas' };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al iniciar sesión' 
      };
    }
  };

  const registerUser = async (email, password1, password2, telefono) => {
    try {
      const res = await api.post('/register/', { 
        email, 
        password1, 
        password2, 
        telefono 
      });
      if (res.data.success) {
        await fetchUser();
        return { success: true };
      }
      return { success: false, error: 'Error al registrar' };
    } catch (error) {
      const fieldErrors = error.response?.data?.errors;
      const genericError = error.response?.data?.error;
      return { 
        success: false, 
        error: genericError || (fieldErrors ? Object.values(fieldErrors)[0] : 'Error en el registro')
      };
    }
  };

  const logoutUser = async () => {
    try {
      await api.post('/logout/');
      setUser(null);
      setOrders({ pedidos_catalogo: [], ordenes: [], importaciones: [] });
      return { success: true };
    } catch (error) {
      console.error('Error logging out:', error);
      return { success: false };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      orders,
      loading,
      loginUser,
      registerUser,
      logoutUser,
      refreshUser: fetchUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
