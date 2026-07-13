import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import PaymentModal from '../components/PaymentModal';

interface CarritoProps {
  onBackToCatalog?: () => void;
}

export default function Carrito({ onBackToCatalog }: CarritoProps) {
  const { cart, removeFromCart, updateQuantity, totalAmount, clearCart } = useCart();
  const { user } = useAuth();
  
  const [nombre, setNombre] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');
  const [tasaVes, setTasaVes] = useState<string | null>(null);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [savedTotalUsd, setSavedTotalUsd] = useState<number>(0);
  const [savedTotalVes, setSavedTotalVes] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      if (user.nombre_completo && !nombre) {
        setNombre(user.nombre_completo);
      }
      if (user.telefono && !telefono) {
        setTelefono(user.telefono);
      }
    }
  }, [user, nombre, telefono]);

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

  const handleCheckout = async (e: React.FormEvent<HTMLFormElement>) => {
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
      
      const codigo = response.data.codigo;
      setSavedTotalUsd(totalAmount);
      setSavedTotalVes(totalAmountVes ? parseFloat(totalAmountVes) : null);
      setSuccess(codigo);
      clearCart();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al procesar el pedido.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 bg-gray-50/50 dark:bg-gray-950/20 animate-fade-in">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 text-center shadow-xl shadow-primary-100/50 dark:shadow-black/25 hover:shadow-primary-200/50 dark:hover:border-primary-900/40 transition-all duration-200 animate-scale-in">
          <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-100 dark:border-emerald-900/50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-10 h-10" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">¡Pedido Confirmado!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Tu código de seguimiento es:</p>
          <div className="bg-primary-50 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/50 py-4 px-6 rounded-2xl mb-8">
            <span className="text-3xl font-mono font-black tracking-widest text-primary-600 dark:text-primary-400">{success}</span>
          </div>
          <div className="flex flex-col gap-3">
            <button 
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className="flex items-center justify-center gap-2 w-full py-4 px-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all duration-200 shadow-md shadow-green-600/20 hover:shadow-green-500/50 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 dark:focus-visible:ring-offset-gray-900"
            >
              <i className="bi bi-wallet2" aria-hidden="true"></i> Pagar y Notificar por WhatsApp
            </button>
            <button 
              type="button"
              onClick={() => {
                if (onBackToCatalog) onBackToCatalog();
              }}
              className="block w-full py-3.5 px-4 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            >
              Volver al Catálogo
            </button>
          </div>
        </div>

        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          onNotifyComplete={() => {
            if (onBackToCatalog) onBackToCatalog();
          }}
          amountUsd={savedTotalUsd}
          amountVes={savedTotalVes}
          orderCode={success}
          clientName={nombre}
          concept="Pedido de Catálogo"
          orderType="catalogo"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 bg-gray-50/50 dark:bg-gray-950/20 animate-fade-in">
      <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-10">Tu Carrito</h1>
      
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">
        {/* Lista de productos */}
        <div className="lg:col-span-7">
          {cart.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-950 text-gray-400 dark:text-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-6">Tu carrito está vacío.</p>
              <button 
                type="button"
                onClick={() => {
                  if (onBackToCatalog) onBackToCatalog();
                }}
                className="inline-block px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-all duration-200 shadow-md shadow-primary-600/20 hover:shadow-primary-500/50 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-gray-900"
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
                  className="group flex py-6 px-6 bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800/60 rounded-3xl items-center shadow-sm hover:shadow-[0_10px_30px_-10px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_10px_30px_-10px_rgba(225,29,72,0.25)] hover:border-primary-200 dark:hover:border-primary-900/40 transition-all duration-200 animate-scale-in"
                >
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-2 border border-gray-100 dark:border-gray-800/60">
                    {item.imagen ? (
                      <img src={item.imagen} alt={`Imagen de ${item.nombre}`} className="h-full w-full object-contain" />
                    ) : (
                      <i className="bi bi-tools text-gray-400 dark:text-gray-600 text-2xl" aria-hidden="true"></i>
                    )}
                  </div>

                  <div className="ml-4 sm:ml-6 flex flex-1 flex-col min-w-0">
                    <div>
                      <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white gap-4">
                        <h3 className="line-clamp-2">{item.nombre}</h3>
                        <p className="font-black flex-shrink-0 whitespace-nowrap">${(Number(item.precio) * item.cantidad).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex flex-1 items-end justify-between text-sm mt-6">
                      <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-950 rounded-xl p-1 border border-gray-200/80 dark:border-gray-800">
                        <button 
                          onClick={() => updateQuantity(item.producto_id, item.cantidad - 1)}
                          aria-label={`Reducir cantidad de ${item.nombre}`}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                          -
                        </button>
                        <span className="text-gray-900 dark:text-white font-bold w-6 text-center" aria-live="polite">{item.cantidad}</span>
                        <button 
                          onClick={() => updateQuantity(item.producto_id, item.cantidad + 1)}
                          aria-label={`Aumentar cantidad de ${item.nombre}`}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.producto_id)}
                        className="font-bold text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md px-2 py-1"
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
          <div className="mt-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl px-6 py-8 sm:p-10 lg:col-span-5 lg:mt-0 shadow-sm hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.25)] hover:border-primary-100 dark:hover:border-primary-900/40 transition-all duration-200 sticky top-24 animate-slide-up delay-100">
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6">Resumen del pedido</h2>
            
            <div className="flow-root mb-8">
              <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-gray-800">
                <p className="text-gray-500 dark:text-gray-400 font-medium">Subtotal</p>
                <p className="font-bold text-gray-900 dark:text-white">${totalAmount.toFixed(2)}</p>
              </div>
              <div className="flex flex-col py-6">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">Total a pagar</p>
                  <p className="text-2xl font-black text-primary-600 dark:text-primary-500">${totalAmount.toFixed(2)}</p>
                </div>
                {totalAmountVes && (
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Referencia en bolívares</p>
                    <p className="text-md font-bold text-gray-700 dark:text-gray-300">≈ {totalAmountVes} Bs.</p>
                  </div>
                )}
              </div>
            </div>

            <form onSubmit={handleCheckout} className="space-y-6" noValidate>
              <div>
                <label htmlFor="nombre" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nombre completo</label>
                <input
                  id="nombre"
                  type="text"
                  required
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-500 focus:bg-white dark:focus:bg-gray-950 transition-all duration-200"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div>
                <label htmlFor="telefonoCheckout" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Teléfono (WhatsApp)</label>
                <input
                  id="telefonoCheckout"
                  type="tel"
                  required
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-500 focus:bg-white dark:focus:bg-gray-950 transition-all duration-200"
                  placeholder="Ej. +58 412 1234567"
                />
              </div>

              {error && (
                <div 
                  className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium animate-fade-in"
                  role="alert"
                  aria-live="polite"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-md shadow-primary-600/20 hover:shadow-primary-500/50 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-gray-900 disabled:opacity-50 disabled:hover:-translate-y-0 disabled:cursor-not-allowed flex justify-center items-center"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Procesando...
                  </span>
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
