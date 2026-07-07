import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function Carrito() {
  const { cart, removeFromCart, updateQuantity, totalAmount, clearCart } = useCart();
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

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
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-3xl p-8 text-center shadow-2xl shadow-rose-900/20">
          <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">¡Pedido Confirmado!</h2>
          <p className="text-gray-400 mb-6">Tu código de seguimiento es:</p>
          <div className="bg-gray-950 border border-gray-800 py-4 px-6 rounded-2xl mb-8">
            <span className="text-2xl font-mono font-black tracking-widest text-rose-500">{success}</span>
          </div>
          <Link to="/" className="block w-full py-3 px-4 bg-rose-600 text-white rounded-xl font-medium hover:bg-rose-500 transition-colors">
            Volver al Catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-white mb-10">Tu Carrito</h1>
      
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:items-start">
        {/* Lista de productos */}
        <div className="lg:col-span-7">
          {cart.length === 0 ? (
            <div className="bg-gray-900/50 border border-gray-800 rounded-3xl p-12 text-center">
              <p className="text-gray-400 text-lg mb-6">Tu carrito está vacío.</p>
              <Link to="/" className="inline-block px-6 py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors">
                Explorar productos
              </Link>
            </div>
          ) : (
            <ul className="space-y-6">
              {cart.map((item) => (
                <li key={item.producto_id} className="flex py-6 px-6 sm:px-8 bg-gray-900 border border-gray-800 rounded-3xl items-center shadow-lg">
                  <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-950 flex items-center justify-center p-2">
                    {item.imagen ? (
                      <img src={item.imagen} alt={item.nombre} className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-gray-600 text-2xl">🔧</span>
                    )}
                  </div>

                  <div className="ml-6 flex flex-1 flex-col">
                    <div>
                      <div className="flex justify-between text-base font-medium text-white">
                        <h3 className="line-clamp-2">{item.nombre}</h3>
                        <p className="ml-4 font-bold">${(item.precio * item.cantidad).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex flex-1 items-end justify-between text-sm mt-4">
                      <div className="flex items-center space-x-3 bg-gray-950 rounded-lg p-1 border border-gray-800">
                        <button 
                          onClick={() => updateQuantity(item.producto_id, item.cantidad - 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white bg-gray-900 rounded-md"
                        >
                          -
                        </button>
                        <span className="text-white font-medium w-4 text-center">{item.cantidad}</span>
                        <button 
                          onClick={() => updateQuantity(item.producto_id, item.cantidad + 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white bg-gray-900 rounded-md"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.producto_id)}
                        className="font-medium text-rose-500 hover:text-rose-400 transition-colors"
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
          <div className="mt-16 bg-gray-900 border border-gray-800 rounded-3xl px-6 py-8 sm:p-10 lg:col-span-5 lg:mt-0 shadow-xl shadow-black/50 sticky top-24">
            <h2 className="text-xl font-bold text-white mb-6">Resumen del pedido</h2>
            
            <div className="flow-root mb-8">
              <div className="flex items-center justify-between py-4 border-b border-gray-800">
                <p className="text-gray-400">Subtotal</p>
                <p className="font-medium text-white">${totalAmount.toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between py-6">
                <p className="text-xl font-bold text-white">Total a pagar</p>
                <p className="text-2xl font-black text-rose-500">${totalAmount.toFixed(2)}</p>
              </div>
            </div>

            <form onSubmit={handleCheckout} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nombre completo</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Teléfono (WhatsApp)</label>
                <input
                  type="tel"
                  required
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all"
                  placeholder="Ej. +58 412 1234567"
                />
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-rose-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
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
