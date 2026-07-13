import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axios';

export type PaymentMethod = 'PAGO_MOVIL' | 'BINANCE' | 'WALLY' | 'EFECTIVO' | null;

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amountUsd: number;
  amountVes: number | null;
  orderCode: string;
  clientName: string;
  concept: string; // e.g. "Pedido de Catálogo", "Inicial de Importación"
  orderType: 'servicio' | 'importacion' | 'catalogo';
  onNotifyComplete?: () => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  amountUsd,
  amountVes,
  orderCode,
  clientName,
  concept,
  orderType,
  onNotifyComplete
}: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorSubmit, setErrorSubmit] = useState<string | null>(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [referencia, setReferencia] = useState('');
  const [copiedData, setCopiedData] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedData(field);
    setTimeout(() => setCopiedData(null), 2000);
  };

  const handleNotify = async () => {
    const num = '584245022292';
    let msj = `Hola MP Tech, acabo de registrar un pago para: *${concept}*\n\n`;
    msj += `*Código de Orden:* ${orderCode}\n`;
    msj += `*Cliente:* ${clientName}\n`;
    msj += `*Monto:* $${amountUsd.toFixed(2)} ${amountVes ? `(≈ ${amountVes.toFixed(2)} Bs)` : ''}\n`;
    msj += `*Método de Pago:* ${method}\n`;
    
    if (method !== 'EFECTIVO') {
      msj += `*Fecha del Pago:* ${fecha}\n`;
      msj += `*Referencia:* ${referencia}\n`;
    } else {
      msj += `*Nota:* Entregaré el efectivo directamente en el taller de MP Tech.\n`;
    }

    try {
      setIsSubmitting(true);
      setErrorSubmit(null);
      // Registrar pago en el backend
      await api.post('/pagos/registrar/', {
        tipo_orden: orderType,
        codigo_orden: orderCode,
        monto_usd: amountUsd,
        monto_ves: amountVes,
        metodo: method,
        fecha: fecha,
        referencia: referencia,
        concepto: concept
      });

      // Si todo sale bien, abrir WP y cerrar
      const wpUrl = `https://wa.me/${num}?text=${encodeURIComponent(msj)}`;
      window.open(wpUrl, '_blank');
      onClose();
      if (onNotifyComplete) onNotifyComplete();
    } catch (error) {
      console.error("Error al registrar pago:", error);
      setErrorSubmit("Ocurrió un error al registrar el pago. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCashPayment = method === 'EFECTIVO';
  const isFormValid = isCashPayment || (fecha && referencia.length >= 4);

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center p-4 sm:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl relative transition-colors duration-200 max-h-[95vh] overflow-y-auto">
        {/* Botón Cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 z-10"
          aria-label="Cerrar modal de pago"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="text-center mb-4 mt-2">
          <div className="w-10 h-10 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mx-auto mb-2 border border-primary-100 dark:border-primary-900/30 shadow-sm">
            <i className="bi bi-wallet2 text-xl" aria-hidden="true"></i>
          </div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white">Registrar Pago</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Selecciona el método de pago para la orden <span className="font-bold text-gray-700 dark:text-gray-300">#{orderCode}</span>.
          </p>
        </div>

        {/* Montos Totales */}
        <div className="bg-gray-50 dark:bg-gray-950/40 border border-gray-200 dark:border-gray-800 rounded-xl p-3 flex justify-between items-center mb-5">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total a Pagar</span>
          <div className="text-right">
            <span className="block text-xl font-black text-gray-900 dark:text-white">
              ${amountUsd.toFixed(2)}
            </span>
            {amountVes && (
              <span className="block text-xs font-bold text-primary-600 dark:text-primary-400 mt-0.5">
                ≈ {amountVes.toFixed(2)} Bs
              </span>
            )}
          </div>
        </div>

        {/* Selección de Método */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          <button
            type="button"
            onClick={() => setMethod('PAGO_MOVIL')}
            className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-200 text-center
              ${method === 'PAGO_MOVIL' 
                ? 'bg-primary-50 dark:bg-primary-950/20 border-primary-600 text-primary-600 dark:text-primary-400 ring-2 ring-primary-600 ring-offset-2 dark:ring-offset-gray-900' 
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <i className="bi bi-bank2 text-lg" aria-hidden="true"></i>
            Transferencia
          </button>
          
          <button
            type="button"
            onClick={() => setMethod('BINANCE')}
            className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-200 text-center
              ${method === 'BINANCE' 
                ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-500 text-yellow-600 dark:text-yellow-500 ring-2 ring-yellow-500 ring-offset-2 dark:ring-offset-gray-900' 
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <i className="bi bi-currency-bitcoin text-lg" aria-hidden="true"></i>
            Binance Pay
          </button>

          <button
            type="button"
            onClick={() => setMethod('WALLY')}
            className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-200 text-center
              ${method === 'WALLY' 
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 text-emerald-600 dark:text-emerald-500 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-gray-900' 
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <i className="bi bi-phone-vibrate text-lg" aria-hidden="true"></i>
            Wally
          </button>

          <button
            type="button"
            onClick={() => setMethod('EFECTIVO')}
            className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all duration-200 text-center
              ${method === 'EFECTIVO' 
                ? 'bg-gray-100 dark:bg-gray-800 border-gray-600 text-gray-800 dark:text-gray-200 ring-2 ring-gray-600 ring-offset-2 dark:ring-offset-gray-900' 
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <i className="bi bi-cash-stack text-lg" aria-hidden="true"></i>
            Efectivo
          </button>
        </div>

        {/* Detalles de Cuenta y Formulario */}
        <div>
          {method === 'PAGO_MOVIL' && (
            <div className="animate-fade-in space-y-4">
              <div className="bg-gray-50 dark:bg-gray-950/30 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-sm">
                <p className="font-bold text-gray-900 dark:text-white mb-3">Datos de Pago Móvil / Transferencia:</p>
                <ul className="space-y-3">
                  <li className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Banco:</span>
                    <span className="font-bold text-gray-900 dark:text-white">Banesco</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Teléfono:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-900 dark:text-white">04144846151</span>
                      <button onClick={() => handleCopy('04144846151', 'tlf')} className="text-gray-400 hover:text-primary-600 transition-colors" title="Copiar"><i className={`bi ${copiedData === 'tlf' ? 'bi-check2 text-green-500' : 'bi-clipboard'}`}></i></button>
                    </div>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Cédula:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-900 dark:text-white">V-29685051</span>
                      <button onClick={() => handleCopy('V29685051', 'cedula')} className="text-gray-400 hover:text-primary-600 transition-colors" title="Copiar"><i className={`bi ${copiedData === 'cedula' ? 'bi-check2 text-green-500' : 'bi-clipboard'}`}></i></button>
                    </div>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">N° de Cuenta:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-900 dark:text-white text-xs">01340866150001455248</span>
                      <button onClick={() => handleCopy('01340866150001455248', 'cuenta')} className="text-gray-400 hover:text-primary-600 transition-colors" title="Copiar"><i className={`bi ${copiedData === 'cuenta' ? 'bi-check2 text-green-500' : 'bi-clipboard'}`}></i></button>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {method === 'BINANCE' && (
            <div className="animate-fade-in space-y-4">
              <div className="bg-yellow-50/50 dark:bg-yellow-950/10 border border-yellow-200 dark:border-yellow-900/30 rounded-xl p-4 text-sm">
                <p className="font-bold text-gray-900 dark:text-white mb-3">Datos de Binance Pay:</p>
                <ul className="space-y-3">
                  <li className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Email asociado:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-900 dark:text-white text-xs break-all">hellomanuelgarcia@gmail.com</span>
                      <button onClick={() => handleCopy('hellomanuelgarcia@gmail.com', 'binance_email')} className="text-gray-400 hover:text-yellow-600 transition-colors shrink-0" title="Copiar"><i className={`bi ${copiedData === 'binance_email' ? 'bi-check2 text-green-500' : 'bi-clipboard'}`}></i></button>
                    </div>
                  </li>
                </ul>
                <div className="mt-4 pt-4 border-t border-yellow-200/50 dark:border-yellow-900/20 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">O si lo prefieres, escanea o pulsa el enlace directo de pago:</p>
                  <a href="https://app.binance.com/uni-qr/JBVzpzGo" target="_blank" rel="noopener noreferrer" className="inline-block px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-yellow-950 font-bold rounded-lg transition-colors text-xs">
                    <i className="bi bi-qr-code mr-1"></i> Abrir Enlace de Pago Directo
                  </a>
                </div>
              </div>
            </div>
          )}

          {method === 'WALLY' && (
            <div className="animate-fade-in space-y-4">
              <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/30 rounded-xl p-4 text-sm">
                <p className="font-bold text-gray-900 dark:text-white mb-3">Datos de Wally Tech:</p>
                <ul className="space-y-3">
                  <li className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Teléfono:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-900 dark:text-white">04245022292</span>
                      <button onClick={() => handleCopy('04245022292', 'wally_tlf')} className="text-gray-400 hover:text-emerald-600 transition-colors" title="Copiar"><i className={`bi ${copiedData === 'wally_tlf' ? 'bi-check2 text-green-500' : 'bi-clipboard'}`}></i></button>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {method === 'EFECTIVO' && (
            <div className="animate-fade-in">
              <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm text-center">
                <i className="bi bi-geo-alt text-3xl text-gray-400 mb-2 inline-block"></i>
                <p className="font-bold text-gray-900 dark:text-white mb-1">Pago presencial en nuestra sede</p>
                <p className="text-gray-500 dark:text-gray-400 font-medium">
                  Al notificar el pago, se registrará que realizarás la entrega de divisas físicas directamente en nuestro taller en Naguanagua, Valencia.
                </p>
              </div>
            </div>
          )}

          {/* Formulario de Reporte de Referencia (Oculto en Efectivo) */}
          {method && method !== 'EFECTIVO' && (
            <div className="mt-5 space-y-3 animate-slide-up">
              <h3 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider mb-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                Ingresa los datos de tu pago
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="fecha" className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Fecha del Pago</label>
                  <input
                    id="fecha"
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="referencia" className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Referencia (Últimos dígitos)</label>
                  <input
                    id="referencia"
                    type="text"
                    placeholder="Ej. 1234"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-xs font-bold font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        {method && (
          <>
            {/* Error Message */}
            {errorSubmit && (
              <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-bold animate-fade-in text-center">
                <i className="bi bi-exclamation-triangle-fill mr-2"></i> {errorSubmit}
              </div>
            )}

            {/* Botón Flotante */}
            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={handleNotify}
                disabled={!isFormValid || isSubmitting}
                className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
                  !isFormValid || isSubmitting
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed shadow-none'
                    : 'bg-primary-600 hover:bg-primary-500 text-white shadow-primary-600/30 hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-primary-500'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Registrando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-whatsapp text-base" aria-hidden="true"></i> Notificar Pago por WhatsApp
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
