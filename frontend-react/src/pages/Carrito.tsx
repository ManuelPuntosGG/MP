import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import PaymentModal from '../components/PaymentModal';

interface CarritoProps {
  onBackToCatalog?: () => void;
}

export default function Carrito({ onBackToCatalog }: CarritoProps) {
  const { cart, removeFromCart, updateQuantity, totalAmount, clearCart } = useCart();
  const { user, refreshUser } = useAuth();

  const [nombre, setNombre] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');
  const [tasaVes, setTasaVes] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [savedTotalUsd, setSavedTotalUsd] = useState<number>(0);
  const [savedTotalVes, setSavedTotalVes] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

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

    if (!nombre.trim() || !telefono.trim()) {
      setError('Por favor ingresa tu nombre completo y teléfono de contacto.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/guardar-pedido-catalogo/', {
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        productos: cart.map((item) => ({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio: item.precio,
          nombre: item.nombre,
        })),
      });

      const codigo = response.data.codigo;
      if (user) refreshUser();
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
      <div className="py-6 px-2 flex items-center justify-center animate-fade-in">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-emerald-200/60 dark:border-emerald-900/50">
            <i className="bi bi-check-lg text-3xl" aria-hidden="true"></i>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2">
            ¡Pedido Confirmado!
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Guarda tu código único de seguimiento para consultar o reportar tu pago:
          </p>

          <div className="bg-primary-50/70 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/50 py-3.5 px-5 rounded-2xl mb-6 flex items-center justify-center gap-3">
            <span className="text-2xl font-mono font-black tracking-widest text-primary-600 dark:text-primary-400 tabular-nums">
              {success}
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(success);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="p-2 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/50 text-primary-600 dark:text-primary-400 transition-colors"
              aria-label="Copiar código de pedido"
              title="Copiar código"
            >
              <i className={`bi ${copiedCode ? 'bi-check2 text-emerald-500' : 'bi-clipboard'}`} aria-hidden="true"></i>
            </button>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 dark:focus-visible:ring-offset-gray-900"
            >
              <i className="bi bi-wallet2" aria-hidden="true"></i> Reportar Pago y Notificar por WhatsApp
            </button>
            <button
              type="button"
              onClick={() => {
                if (onBackToCatalog) onBackToCatalog();
              }}
              className="block w-full py-3 px-4 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
            >
              Seguir viendo el catálogo
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
    <div className="animate-fade-in">
      <div className="flex items-center justify-between pr-10 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
            Tu Carrito de Compras
          </h2>
          {cart.length > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
              Verifica las cantidades antes de generar tu orden.
            </p>
          )}
        </div>
        {cart.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="text-xs font-bold text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg"
          >
            <i className="bi bi-trash3" aria-hidden="true"></i>
            Vaciar
          </button>
        )}
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-x-8 lg:items-start">
        {/* Lista de productos */}
        <div className="lg:col-span-7">
          {cart.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-950/50 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-10 text-center">
              <div className="w-14 h-14 bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-200/60 dark:border-gray-800">
                <i className="bi bi-cart-x text-2xl" aria-hidden="true"></i>
              </div>
              <p className="text-gray-900 dark:text-white font-bold text-base mb-1">
                Tu carrito está vacío
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-6">
                Añade componentes o equipos desde la tienda para procesarlos aquí.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (onBackToCatalog) onBackToCatalog();
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-xs sm:text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                Explorar productos
              </button>
            </div>
          ) : (
            <ul className="space-y-3">
              {cart.map((item) => (
                <li
                  key={item.producto_id}
                  className="flex p-4 bg-gray-50/70 dark:bg-gray-950/60 border border-gray-200/70 dark:border-gray-800 rounded-2xl items-center gap-4"
                >
                  <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center p-2 border border-gray-200/60 dark:border-gray-800">
                    {item.imagen ? (
                      <img src={item.imagen} alt={item.nombre} className="h-full w-full object-contain" />
                    ) : (
                      <i className="bi bi-cpu text-gray-400 dark:text-gray-600 text-xl" aria-hidden="true"></i>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col min-w-0">
                    <div className="flex justify-between items-start text-sm font-bold text-gray-900 dark:text-white gap-3">
                      <h3 className="line-clamp-2 leading-snug">{item.nombre}</h3>
                      <p className="font-black flex-shrink-0 whitespace-nowrap tabular-nums">
                        ${(Number(item.precio) * item.cantidad).toFixed(2)}
                      </p>
                    </div>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums mt-0.5">
                      ${Number(item.precio).toFixed(2)} c/u · Máx. {item.stock}
                    </p>

                    <div className="flex items-center justify-between text-xs mt-3">
                      <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 rounded-xl p-1 border border-gray-200 dark:border-gray-800 tabular-nums">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.producto_id, item.cantidad - 1)}
                          disabled={item.cantidad <= 1}
                          aria-label={`Reducir cantidad de ${item.nombre}`}
                          className="w-7 h-7 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-40 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 font-bold"
                        >
                          −
                        </button>
                        <span className="text-gray-900 dark:text-white font-bold w-6 text-center" aria-live="polite">
                          {item.cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.producto_id, item.cantidad + 1)}
                          disabled={item.cantidad >= item.stock}
                          aria-label={`Aumentar cantidad de ${item.nombre}`}
                          className="w-7 h-7 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-40 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 font-bold"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.producto_id)}
                        className="font-bold text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg px-2 py-1"
                      >
                        Quitar
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
          <div className="mt-8 lg:mt-0 bg-gray-50 dark:bg-gray-950/70 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 sm:p-6 lg:col-span-5">
            <h3 className="text-base font-black text-gray-900 dark:text-white mb-4">
              Resumen del Pedido
            </h3>

            <div className="space-y-3 mb-6 pb-4 border-b border-gray-200/70 dark:border-gray-800 tabular-nums">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-medium">
                <span>Subtotal ({cart.reduce((acc, i) => acc + i.cantidad, 0)} artículos)</span>
                <span className="font-bold text-gray-900 dark:text-white">${totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-baseline justify-between pt-2">
                <span className="text-sm font-bold text-gray-900 dark:text-white">Total a Pagar</span>
                <div className="text-right">
                  <span className="text-2xl font-black text-primary-600 dark:text-primary-500 block">
                    ${totalAmount.toFixed(2)}
                  </span>
                  {totalAmountVes && (
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                      ≈ {totalAmountVes} Bs
                    </span>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleCheckout} className="space-y-4" noValidate>
              <div>
                <label htmlFor="nombreCheckout" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Nombre completo
                </label>
                <input
                  id="nombreCheckout"
                  type="text"
                  autoComplete="name"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 transition-colors font-medium"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div>
                <label htmlFor="telefonoCheckout" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Teléfono (WhatsApp)
                </label>
                <input
                  id="telefonoCheckout"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 transition-colors font-medium tabular-nums"
                  placeholder="Ej. +58 412 1234567"
                />
              </div>

              {error && (
                <div
                  className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-bold animate-fade-in"
                  role="alert"
                  aria-live="polite"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3.5 px-5 rounded-xl transition-colors duration-150 shadow-sm text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Procesando...</span>
                  </>
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
