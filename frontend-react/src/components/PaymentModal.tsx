import React, { useState, useEffect } from 'react';
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
  concept: string;
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
  onNotifyComplete,
}: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('PAGO_MOVIL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorSubmit, setErrorSubmit] = useState<string | null>(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [referencia, setReferencia] = useState('');
  const [copiedData, setCopiedData] = useState<string | null>(null);

  // Cerrar con Escape y bloquear scroll del body (fixing-accessibility)
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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
      await api.post('/pagos/registrar/', {
        tipo_orden: orderType,
        codigo_orden: orderCode,
        monto_usd: amountUsd,
        monto_ves: amountVes,
        metodo: method,
        fecha: fecha,
        referencia: referencia,
        concepto: concept,
      });

      const wpUrl = `https://wa.me/${num}?text=${encodeURIComponent(msj)}`;
      window.open(wpUrl, '_blank');
      onClose();
      if (onNotifyComplete) onNotifyComplete();
    } catch (error) {
      console.error('Error al registrar pago:', error);
      setErrorSubmit('Ocurrió un error al registrar el pago. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCashPayment = method === 'EFECTIVO';
  const isFormValid = Boolean(method && (isCashPayment || (fecha && referencia.trim().length >= 4)));

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center p-4 sm:p-6 animate-fade-in tabular-nums"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-modal-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl relative max-h-[92dvh] overflow-y-auto animate-scale-in"
      >
        {/* Botón Cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 z-10"
          aria-label="Cerrar modal de pago"
          title="Cerrar (Esc)"
        >
          <i className="bi bi-x-lg text-sm" aria-hidden="true"></i>
        </button>

        <div className="text-center mb-4 mt-1">
          <div className="w-11 h-11 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-2xl flex items-center justify-center mx-auto mb-2.5 border border-primary-100 dark:border-primary-900/50">
            <i className="bi bi-wallet2 text-lg" aria-hidden="true"></i>
          </div>
          <h2 id="payment-modal-title" className="text-xl font-black text-gray-900 dark:text-white">
            Reportar Pago
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Orden <span className="font-mono font-bold text-gray-800 dark:text-gray-200">#{orderCode}</span> · {concept}
          </p>
        </div>

        {/* Montos Totales */}
        <div className="bg-gray-50 dark:bg-gray-950/60 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-3.5 flex justify-between items-center mb-5">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Monto a Pagar
          </span>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5" role="radiogroup" aria-label="Método de pago">
          <button
            type="button"
            onClick={() => setMethod('PAGO_MOVIL')}
            aria-pressed={method === 'PAGO_MOVIL'}
            className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors text-center ${
              method === 'PAGO_MOVIL'
                ? 'bg-primary-50 dark:bg-primary-950/30 border-primary-600 text-primary-600 dark:text-primary-400 ring-1 ring-primary-600'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <i className="bi bi-bank2 text-base" aria-hidden="true"></i>
            <span>Pago Móvil</span>
          </button>

          <button
            type="button"
            onClick={() => setMethod('BINANCE')}
            aria-pressed={method === 'BINANCE'}
            className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors text-center ${
              method === 'BINANCE'
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-500 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <i className="bi bi-currency-bitcoin text-base" aria-hidden="true"></i>
            <span>Binance</span>
          </button>

          <button
            type="button"
            onClick={() => setMethod('WALLY')}
            aria-pressed={method === 'WALLY'}
            className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors text-center ${
              method === 'WALLY'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <i className="bi bi-phone-vibrate text-base" aria-hidden="true"></i>
            <span>Wally</span>
          </button>

          <button
            type="button"
            onClick={() => setMethod('EFECTIVO')}
            aria-pressed={method === 'EFECTIVO'}
            className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors text-center ${
              method === 'EFECTIVO'
                ? 'bg-gray-100 dark:bg-gray-800 border-gray-700 text-gray-900 dark:text-white ring-1 ring-gray-700'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <i className="bi bi-cash-stack text-base" aria-hidden="true"></i>
            <span>Efectivo</span>
          </button>
        </div>

        {/* Detalles de Cuenta y Formulario */}
        <div>
          {method === 'PAGO_MOVIL' && (
            <div className="animate-fade-in">
              <div className="bg-gray-50 dark:bg-gray-950/60 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-4 text-xs sm:text-sm">
                <p className="font-bold text-gray-900 dark:text-white mb-3 text-xs uppercase tracking-wider">
                  Datos de Pago Móvil / Transferencia
                </p>
                <ul className="space-y-2.5">
                  <li className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Banco:</span>
                    <span className="font-bold text-gray-900 dark:text-white">Banesco (0134)</span>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Teléfono:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-900 dark:text-white">04144846151</span>
                      <button
                        type="button"
                        onClick={() => handleCopy('04144846151', 'tlf')}
                        className="px-2 py-1 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:border-primary-400 transition-colors flex items-center gap-1"
                        aria-label="Copiar teléfono de Pago Móvil"
                      >
                        <i className={`bi ${copiedData === 'tlf' ? 'bi-check2 text-emerald-500' : 'bi-clipboard'}`} aria-hidden="true"></i>
                        <span>{copiedData === 'tlf' ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Cédula:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-900 dark:text-white">V-29685051</span>
                      <button
                        type="button"
                        onClick={() => handleCopy('29685051', 'cedula')}
                        className="px-2 py-1 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:border-primary-400 transition-colors flex items-center gap-1"
                        aria-label="Copiar cédula"
                      >
                        <i className={`bi ${copiedData === 'cedula' ? 'bi-check2 text-emerald-500' : 'bi-clipboard'}`} aria-hidden="true"></i>
                        <span>{copiedData === 'cedula' ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                  </li>
                  <li className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Cuenta:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-gray-900 dark:text-white text-xs">
                        01340866150001455248
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy('01340866150001455248', 'cuenta')}
                        className="px-2 py-1 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:border-primary-400 transition-colors flex items-center gap-1"
                        aria-label="Copiar número de cuenta"
                      >
                        <i className={`bi ${copiedData === 'cuenta' ? 'bi-check2 text-emerald-500' : 'bi-clipboard'}`} aria-hidden="true"></i>
                        <span>{copiedData === 'cuenta' ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {method === 'BINANCE' && (
            <div className="animate-fade-in">
              <div className="bg-amber-50/50 dark:bg-amber-950/15 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 text-xs sm:text-sm">
                <p className="font-bold text-gray-900 dark:text-white mb-3 text-xs uppercase tracking-wider">
                  Datos de Binance Pay
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-gray-900 dark:text-white text-xs break-all">
                    grupomptech@gmail.com
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy('grupomptech@gmail.com', 'binance_email')}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800 text-xs font-bold text-gray-700 dark:text-gray-200 shrink-0 flex items-center gap-1"
                  >
                    <i className={`bi ${copiedData === 'binance_email' ? 'bi-check2 text-emerald-500' : 'bi-clipboard'}`} aria-hidden="true"></i>
                    <span>{copiedData === 'binance_email' ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
                <div className="mt-3.5 pt-3.5 border-t border-amber-200/60 dark:border-amber-900/30 text-center">
                  <a
                    href="https://app.binance.com/uni-qr/JBVzpzGo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-xl transition-colors text-xs"
                  >
                    <i className="bi bi-qr-code" aria-hidden="true"></i> Abrir Enlace Directo Binance Pay
                  </a>
                </div>
              </div>
            </div>
          )}

          {method === 'WALLY' && (
            <div className="animate-fade-in">
              <div className="bg-emerald-50/50 dark:bg-emerald-950/15 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-4 text-xs sm:text-sm">
                <p className="font-bold text-gray-900 dark:text-white mb-3 text-xs uppercase tracking-wider">
                  Datos de Wally Tech
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400">Teléfono / Usuario:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gray-900 dark:text-white">04245022292</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('04245022292', 'wally_tlf')}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1"
                    >
                      <i className={`bi ${copiedData === 'wally_tlf' ? 'bi-check2 text-emerald-500' : 'bi-clipboard'}`} aria-hidden="true"></i>
                      <span>{copiedData === 'wally_tlf' ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {method === 'EFECTIVO' && (
            <div className="animate-fade-in">
              <div className="bg-gray-50 dark:bg-gray-950/60 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-xs sm:text-sm text-center">
                <i className="bi bi-geo-alt text-2xl text-primary-600 dark:text-primary-400 mb-1.5 inline-block" aria-hidden="true"></i>
                <p className="font-bold text-gray-900 dark:text-white mb-1">
                  Pago presencial en nuestra sede
                </p>
                <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                  Al confirmar, registraremos que realizarás el pago en efectivo directamente en nuestro laboratorio en Naguanagua, Valencia.
                </p>
              </div>
            </div>
          )}

          {/* Formulario de Reporte de Referencia (Oculto en Efectivo) */}
          {method && method !== 'EFECTIVO' && (
            <div className="mt-4 space-y-3 animate-slide-up">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="fechaPago" className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Fecha del Pago
                  </label>
                  <input
                    id="fechaPago"
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label htmlFor="referenciaPago" className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Referencia (Mín. 4 dígitos)
                  </label>
                  <input
                    id="referenciaPago"
                    type="text"
                    placeholder="Ej. 5892"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        {method && (
          <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
            {errorSubmit && (
              <div
                className="mb-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold text-center"
                role="alert"
              >
                <i className="bi bi-exclamation-triangle-fill mr-1.5" aria-hidden="true"></i>
                {errorSubmit}
              </div>
            )}

            <button
              type="button"
              onClick={handleNotify}
              disabled={!isFormValid || isSubmitting}
              className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
                !isFormValid || isSubmitting
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-500 text-white shadow-sm focus-visible:ring-primary-500'
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Registrando pago...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-whatsapp text-base" aria-hidden="true"></i>
                  <span>Registrar y Notificar por WhatsApp</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
