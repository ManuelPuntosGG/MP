import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function Carrito({ onBackToCatalog }) {
  const { cart, removeFromCart, updateQuantity, totalAmount, clearCart } = useCart();
  const { user } = useAuth();
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tasaVes, setTasaVes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      if (user.nombre_completo && !nombre) {
        setNombre(user.nombre_completo);
      }
      if (user.telefono && !telefono) {
        setTelefono(user.telefono);
      }
    }
  }, [user]);

  useEffect(() => {
    const fetchTasa = async () => {
      try {
        const response = await api.get('/tasa/');
        setTasaVes(response.data.tasa_ves);
      } catch (err) {
        console.error('Error fetching exchange rate:', err);
      }
    };
    fetchTasa();
  }, []);

  const totalAmountVes = tasaVes ? (totalAmount * parseFloat(tasaVes)).toFixed(2) : null;

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/guardar-pedido-catalogo/', {
        nombre,
        telefono,
        productos: cart.map(item => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio: item.precio,
          nombre: item.nombre
        }))
      });
      
      setSuccess(response.data.codigo);
      clearCart();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar el pedido.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 bg-gray-50/50 dark:bg-gray-950/20">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 text-center shadow-xl shadow-rose-100/50 dark:shadow-black/25 hover:shadow-rose-200/50 dark:hover:border-rose-900/40 transition-all duration-300 animate-scale-in">
          <div className="w-20 h-20 bg-green-50 dark:bg-green-950/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-100 dark:border-green-900/50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">¡Pedido Confirmado!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Tu código de seguimiento es:</p>
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 py-4 px-6 rounded-2xl mb-8">
            <span className="text-3xl font-mono font-black tracking-widest text-rose-600 dark:text-rose-400">{success}</span>
          </div>
          <button 
            type="button"
            onClick={() => {
              if (onBackToCatalog) onBackToCatalog();
            }}
            className="block w-full py-4 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:bg-rose-600 dark:hover:bg-rose-600 dark:hover:text-white transition-colors shadow-md"
          >
            Volver al Catálogo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 bg-gray-50/50 dark:bg-gray-950/20 animate-fade-in">
      <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-10">Tu Carrito</h1>
      
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">
        {/* Lista de productos */}
        <div className="lg:col-span-7">
          {cart.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-950 text-gray-400 dark:text-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              </div>
              <p className="text-gray-505 dark:text-gray-450 text-lg mb-6">Tu carrito está vacío.</p>
              <button 
                type="button"
                onClick={() => {
                  if (onBackToCatalog) onBackToCatalog();
                }}
                className="inline-block px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:bg-rose-600 transition-colors shadow-md"
              >
                Explorar productos
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {cart.map((item, index) => (
                <li 
                  key={item.producto_id} 
                  style={{ animationDelay: `${index * 80}ms` }}
                  className="group flex py-6 px-6 bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800/60 rounded-3xl items-center shadow-sm hover:shadow-[0_10px_30px_-10px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_10px_30px_-10px_rgba(225,29,72,0.25)] hover:border-rose-200 dark:hover:border-rose-900/40 transition-all duration-300 animate-scale-in"
                >
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-2 border border-gray-100 dark:border-gray-800/65">
                    {item.imagen ? (
                      <img src={item.imagen} alt={item.nombre} className="h-full w-full object-contain" />
                    ) : (
                      <i className="bi bi-tools text-gray-400 dark:text-gray-600 text-2xl"></i>
                    )}
                  </div>

                  <div className="ml-6 flex flex-1 flex-col">
                    <div>
                      <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white">
                        <h3 className="line-clamp-2 pr-4">{item.nombre}</h3>
                        <p className="ml-4 font-black">${(item.precio * item.cantidad).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex flex-1 items-end justify-between text-sm mt-6">
                      <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-950 rounded-xl p-1 border border-gray-200/80 dark:border-gray-800">
                        <button 
                          onClick={() => updateQuantity(item.producto_id, item.cantidad - 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:shadow-sm transition-all"
                        >
                          -
                        </button>
                        <span className="text-gray-900 dark:text-white font-bold w-6 text-center">{item.cantidad}</span>
                        <button 
                          onClick={() => updateQuantity(item.producto_id, item.cantidad + 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:shadow-sm transition-all"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.producto_id)}
                        className="font-bold text-rose-600 dark:text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Resumen y Checkout */}
        {cart.length > 0 && (
          <div className="mt-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl px-6 py-8 sm:p-10 lg:col-span-5 lg:mt-0 shadow-sm hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.25)] hover:border-rose-100 dark:hover:border-rose-900/40 transition-all duration-300 sticky top-24 animate-slide-up delay-100">
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6">Resumen del pedido</h2>
            
            <div className="flow-root mb-8">
              <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800">
                <p className="text-gray-550 dark:text-gray-400 font-medium">Subtotal</p>
                <p className="font-bold text-gray-900 dark:text-white">${totalAmount.toFixed(2)}</p>
              </div>
              <div className="flex flex-col py-6">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">Total a pagar</p>
                  <p className="text-2xl font-black text-rose-600 dark:text-rose-500">${totalAmount.toFixed(2)}</p>
                </div>
                {totalAmountVes && (
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-gray-505 dark:text-gray-400 font-medium">Referencia en bolívares</p>
                    <p className="text-md font-bold text-gray-700 dark:text-gray-305">≈ {totalAmountVes} Bs.</p>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleCheckout} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nombre completo</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:focus:border-rose-500 focus:bg-white dark:focus:bg-gray-950 outline-none transition-all"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Teléfono (WhatsApp)</label>
                <input
                  type="tel"
                  required
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:focus:border-rose-500 focus:bg-white dark:focus:bg-gray-950 outline-none transition-all"
                  placeholder="Ej. +58 412 1234567"
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 text-red-650 dark:text-red-400 p-4 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 dark:bg-white hover:bg-rose-600 dark:hover:bg-rose-600 text-white dark:text-gray-900 dark:hover:text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
              >
                {loading ? (
                  <span className="animate-pulse">Procesando...</span>
                ) : (
                  'Confirmar Pedido'
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
