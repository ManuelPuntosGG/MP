import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api/axios';

export interface User {
  id: number;
  email: string;
  nombre_completo?: string;
  telefono?: string;
  [key: string]: any;
}

export interface Order {
  codigo: string;
  estado: string;
  [key: string]: any;
}

export interface Importation {
  codigo: string;
  total_usd: number;
  [key: string]: any;
}

export interface CatalogOrder {
  codigo: string;
  total: number;
  total_ves?: number;
  estado_raw?: string;
  estado?: string;
  estado_pago?: 'PENDIENTE' | 'VERIFICADO' | null;
  [key: string]: any;
}

export interface OrdersState {
  pedidos_catalogo: CatalogOrder[];
  ordenes: Order[];
  importaciones: Importation[];
}

export interface AuthContextType {
  user: User | null;
  orders: OrdersState;
  loading: boolean;
  loginUser: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerUser: (email: string, password1: string, password2: string, telefono: string) => Promise<{ success: boolean; error?: string }>;
  logoutUser: () => Promise<{ success: boolean }>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<OrdersState>({ pedidos_catalogo: [], ordenes: [], importaciones: [] });
  const [loading, setLoading] = useState<boolean>(true);

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

  const loginUser = async (email: string, password: string) => {
    try {
      const res = await api.post('/login/', { email, password });
      if (res.data.success) {
        await fetchUser();
        return { success: true };
      }
      return { success: false, error: 'Credenciales incorrectas' };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Error al iniciar sesión' 
      };
    }
  };

  const registerUser = async (email: string, password1: string, password2: string, telefono: string) => {
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
    } catch (error: any) {
      const fieldErrors = error.response?.data?.errors;
      const genericError = error.response?.data?.error;
      return { 
        success: false, 
        error: genericError || (fieldErrors ? Object.values(fieldErrors)[0] as string : 'Error en el registro')
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
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
