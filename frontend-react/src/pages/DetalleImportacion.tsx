import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import PaymentModal from '../components/PaymentModal';

const IMPORT_STAGES = [
  { key: 'PENDIENTE', label: 'Pendiente', iconClass: 'bi bi-clock' },
  { key: 'CONFIRMADA', label: 'Confirmada', iconClass: 'bi bi-check-lg' },
  { key: 'EN_TRANSITO_EXTERIOR', label: 'Tránsito Ext.', iconClass: 'bi bi-airplane' },
  { key: 'EN_TRANSITO_VENEZUELA', label: 'Tránsito Ven.', iconClass: 'bi bi-geo-alt' },
  { key: 'LISTO_RETIRAR', label: 'Listo Retiro', iconClass: 'bi bi-shop' },
];

interface ProductoImportacion {
  nombre?: string;
  url: string;
  tienda?: string;
  precio: string | number;
  peso: string | number | null;
}

interface PedidoImportacion {
  codigo: string;
  fecha: string;
  cliente_nombre: string;
  estado: string;
  estado_raw: string;
  total_usd: number;
  total_ves: number;
  pago_inicial_usd_estimado: number;
  pago_inicial_ves?: number;
  saldo_pendiente_usd_estimado: number;
  saldo_pendiente_ves?: number;
  estado_pago?: 'PENDIENTE' | 'VERIFICADO' | null;
  tasa_confirmacion?: number;
  tasa_entrega?: number;
  carrier_nombre?: string;
  carrier_tracking?: string;
  nota?: string;
  productos: ProductoImportacion[];
}

export default function DetalleImportacion() {
  const { codigo } = useParams<{ codigo: string }>();
  const [pedido, setPedido] = useState<PedidoImportacion | null>(null);
  const [tasaActual, setTasaActual] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState<boolean>(false);

  // Estados para PaymentModal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentConcept, setPaymentConcept] = useState('');
  const [paymentAmountUsd, setPaymentAmountUsd] = useState(0);
  const [paymentAmountVes, setPaymentAmountVes] = useState<number | null>(null);

  const fetchDetalles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [pedidoRes, tasaRes] = await Promise.all([
        api.get(`/importaciones/${codigo}/`),
        api.get('/tasa/'),
      ]);
      setPedido(pedidoRes.data);
      setTasaActual(tasaRes.data.tasa_ves);
    } catch (err: any) {
      console.error('Error cargando detalles de importación:', err);
      setError(err.response?.data?.error || 'No se pudo cargar la orden de importación.');
    } finally {
      setLoading(false);
    }
  }, [codigo]);

  useEffect(() => {
    if (codigo) {
      fetchDetalles();
    }
  }, [codigo, fetchDetalles]);

  if (loading) {
    return (
      <div
        className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-fade-in"
        role="status"
        aria-live="polite"
      >
        <div className="h-5 w-36 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-8 space-y-6 animate-pulse">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded-xl" />
          <div className="h-20 w-full bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="h-36 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
            <div className="h-36 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !pedido) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-900 border border-red-200/80 dark:border-red-950 p-8 rounded-3xl text-center shadow-sm animate-scale-in">
          <div className="w-14 h-14 bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <i className="bi bi-exclamation-triangle text-2xl" aria-hidden="true"></i>
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
            Orden no encontrada
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
            {error || 'El pedido de importación solicitado no existe o el código es incorrecto.'}
          </p>
          <Link
            to="/importaciones"
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-sm transition-colors inline-flex items-center gap-2"
          >
            <i className="bi bi-arrow-left" aria-hidden="true"></i> Volver a Importaciones
          </Link>
        </div>
      </div>
    );
  }

  const currentStageIndex = IMPORT_STAGES.findIndex((s) => s.key === pedido.estado_raw);

  const handleOpenPayment = (concepto: string, montoUsd: number, montoVes: number | null) => {
    setPaymentConcept(concepto);
    setPaymentAmountUsd(montoUsd);
    setPaymentAmountVes(montoVes);
    setIsPaymentModalOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in tabular-nums">
      {/* Botón Volver */}
      <Link
        to="/importaciones"
        className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 mb-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg px-2 py-1 -ml-2"
      >
        <i className="bi bi-arrow-left" aria-hidden="true"></i> Volver a Importaciones
      </Link>

      {/* Tarjeta de Contenedor de Resultados */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm animate-slide-up">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 dark:border-gray-800 pb-6 mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400 text-lg">
              <i className="bi bi-box-seam" aria-hidden="true"></i>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
                Seguimiento Logístico
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white font-mono tracking-tight">
                {pedido.codigo}
              </h1>
            </div>
          </div>
          <span
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
              pedido.estado_raw === 'ENTREGADO'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400'
                : 'bg-primary-50 dark:bg-primary-950/30 border-primary-200 dark:border-primary-900/50 text-primary-600 dark:text-primary-400'
            }`}
            role="status"
          >
            {pedido.estado}
          </span>
        </div>

        {/* Stepper de Estados */}
        <div className="mb-8">
          {pedido.estado_raw === 'ENTREGADO' ? (
            <div className="bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-200/70 dark:border-emerald-900/50 p-5 rounded-2xl flex items-start gap-3.5">
              <i className="bi bi-check-circle-fill text-2xl text-emerald-500 mt-0.5 flex-shrink-0" aria-hidden="true"></i>
              <div>
                <h2 className="text-base font-bold text-emerald-800 dark:text-emerald-400">
                  Pedido Entregado con Éxito
                </h2>
                <p className="text-xs sm:text-sm text-emerald-700/90 dark:text-emerald-400/80 mt-1 font-medium leading-relaxed">
                  Esta orden ha sido formalmente entregada y todos los montos correspondientes se encuentran liquidados.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative" aria-label="Progreso del pedido">
              {/* Horizontal Stepper (Desktop) */}
              <div className="hidden sm:block relative py-3">
                <div className="absolute top-8 left-[10%] right-[10%] h-0.5 bg-gray-200 dark:bg-gray-800 z-0">
                  <div
                    className="h-full bg-primary-600 transition-[width] duration-500"
                    style={{
                      width: `${(Math.max(0, currentStageIndex) / (IMPORT_STAGES.length - 1)) * 100}%`,
                    }}
                    aria-hidden="true"
                  />
                </div>

                <div className="flex justify-between items-center relative z-10">
                  {IMPORT_STAGES.map((stage, idx) => {
                    const isCompleted = idx < currentStageIndex;
                    const isActive = idx === currentStageIndex;
                    return (
                      <div
                        key={stage.key}
                        className="flex flex-col items-center flex-1"
                        aria-current={isActive ? 'step' : undefined}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border transition-colors duration-200 ${
                            isCompleted
                              ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                              : isActive
                              ? 'bg-white dark:bg-gray-900 border-primary-600 text-primary-600 dark:text-primary-400 ring-4 ring-primary-50 dark:ring-primary-950/40'
                              : 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-600'
                          }`}
                        >
                          <i
                            className={`${stage.iconClass} ${
                              isCompleted
                                ? 'text-white'
                                : isActive
                                ? 'text-primary-600 dark:text-primary-400'
                                : 'text-gray-400 dark:text-gray-600'
                            }`}
                            aria-hidden="true"
                          ></i>
                        </div>
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider mt-2.5 ${
                            isActive
                              ? 'text-primary-600 dark:text-primary-400'
                              : isCompleted
                              ? 'text-gray-700 dark:text-gray-300'
                              : 'text-gray-400 dark:text-gray-600'
                          }`}
                        >
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Vertical Stepper (Mobile) */}
              <div className="block sm:hidden relative pl-4 py-2">
                <div className="absolute left-[35px] top-6 bottom-6 w-0.5 bg-gray-200 dark:bg-gray-800 z-0">
                  <div
                    className="w-full bg-primary-600 transition-[height] duration-500"
                    style={{
                      height: `${(Math.max(0, currentStageIndex) / (IMPORT_STAGES.length - 1)) * 100}%`,
                    }}
                    aria-hidden="true"
                  />
                </div>

                <div className="flex flex-col gap-5 relative z-10">
                  {IMPORT_STAGES.map((stage, idx) => {
                    const isCompleted = idx < currentStageIndex;
                    const isActive = idx === currentStageIndex;
                    return (
                      <div
                        key={stage.key}
                        className="flex items-center gap-3.5"
                        aria-current={isActive ? 'step' : undefined}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border flex-shrink-0 ${
                            isCompleted
                              ? 'bg-primary-600 border-primary-600 text-white'
                              : isActive
                              ? 'bg-white dark:bg-gray-900 border-primary-600 text-primary-600 dark:text-primary-400 ring-4 ring-primary-50 dark:ring-primary-900/30'
                              : 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-400 dark:text-gray-600'
                          }`}
                        >
                          <i
                            className={`${stage.iconClass} ${
                              isCompleted
                                ? 'text-white'
                                : isActive
                                ? 'text-primary-600 dark:text-primary-400'
                                : 'text-gray-400 dark:text-gray-600'
                            }`}
                            aria-hidden="true"
                          ></i>
                        </div>
                        <div className="text-left">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider block ${
                              isActive
                                ? 'text-primary-600 dark:text-primary-400'
                                : isCompleted
                                ? 'text-gray-700 dark:text-gray-300'
                                : 'text-gray-400 dark:text-gray-500'
                            }`}
                          >
                            {stage.label}
                          </span>
                          {isActive && (
                            <span className="text-[11px] text-primary-600 dark:text-primary-400 font-semibold block">
                              Etapa actual
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resumen General en 3 Columnas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-950/50 border border-gray-200/60 dark:border-gray-800 p-5 rounded-2xl mb-8">
          <div className="text-left">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              <i className="bi bi-person mr-1" aria-hidden="true"></i> Cliente
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white mt-1 block truncate">
              {pedido.cliente_nombre || 'Cliente MP Tech'}
            </span>
          </div>
          <div className="text-left">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              <i className="bi bi-calendar3 mr-1" aria-hidden="true"></i> Fecha de Orden
            </span>
            <span className="text-sm font-bold text-gray-900 dark:text-white mt-1 block">
              {new Date(pedido.fecha).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
          <div className="text-left">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              <i className="bi bi-receipt mr-1" aria-hidden="true"></i> Total Estimado
            </span>
            <span className="text-base font-black text-gray-900 dark:text-white mt-1 block">
              ${pedido.total_usd.toFixed(2)}{' '}
              <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                (≈ {pedido.total_ves.toFixed(2)} Bs)
              </span>
            </span>
          </div>
        </div>

        {/* Tracking Exterior */}
        {pedido.carrier_nombre && (
          <div className="border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 mb-8 bg-gray-50/30 dark:bg-gray-950/30">
            <h2 className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3.5">
              <i className="bi bi-truck text-primary-600 dark:text-primary-400" aria-hidden="true"></i> Información de Tránsito Exterior
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="text-left">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Transportadora (Courier)
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-white mt-1 block">
                  {pedido.carrier_nombre}
                </span>
              </div>
              {pedido.carrier_tracking && (
                <div className="text-left">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Código de Tracking
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-mono font-bold text-primary-600 dark:text-primary-400">
                      {pedido.carrier_tracking}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(pedido.carrier_tracking!);
                        setCopiedTracking(true);
                        setTimeout(() => setCopiedTracking(false), 2000);
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-200/60 dark:hover:bg-gray-800 text-gray-500"
                      title="Copiar tracking"
                      aria-label="Copiar código de tracking"
                    >
                      <i className={`bi ${copiedTracking ? 'bi-check2 text-emerald-500' : 'bi-clipboard'} text-xs`} aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Estructura de Pago 50% / 50% */}
        <div className="mb-8">
          <h2 className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
            <i className="bi bi-credit-card-2-back text-primary-600 dark:text-primary-400" aria-hidden="true"></i> Plan de Financiamiento (50% / 50%)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Inicial 50% */}
            <div
              className={`border rounded-2xl p-5 text-left flex flex-col justify-between ${
                pedido.estado_raw === 'PENDIENTE'
                  ? 'bg-primary-50/20 dark:bg-primary-950/10 border-primary-200 dark:border-primary-900/50'
                  : 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200/70 dark:border-emerald-900/40'
              }`}
            >
              <div>
                <div className="flex justify-between items-center text-xs font-bold text-gray-900 dark:text-white mb-3">
                  <span>
                    <i className="bi bi-shield-check mr-1.5 text-primary-600 dark:text-primary-400" aria-hidden="true"></i>
                    Abono Inicial (50%)
                  </span>
                  {pedido.estado_raw === 'PENDIENTE' ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-primary-100 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300">
                      Requerido
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                      Confirmado
                    </span>
                  )}
                </div>
                <p className="text-2xl font-black text-gray-900 dark:text-white">
                  ${pedido.pago_inicial_usd_estimado.toFixed(2)}
                </p>

                {pedido.pago_inicial_ves ? (
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">
                    ≈ {pedido.pago_inicial_ves.toFixed(2)} Bs
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mt-1">
                    {tasaActual
                      ? `≈ ${(pedido.pago_inicial_usd_estimado * parseFloat(tasaActual)).toFixed(2)} Bs`
                      : '—'}
                  </p>
                )}
              </div>

              {pedido.estado_pago === 'PENDIENTE' && pedido.estado_raw === 'PENDIENTE' ? (
                <div className="mt-4 w-full py-2.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-bold text-center rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs flex items-center justify-center gap-1.5">
                  <i className="bi bi-hourglass-split" aria-hidden="true"></i> Pago en verificación
                </div>
              ) : pedido.estado_pago === 'VERIFICADO' && pedido.estado_raw === 'PENDIENTE' ? (
                <div className="mt-4 w-full py-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold text-center rounded-xl border border-emerald-200 dark:border-emerald-900/50 text-xs flex items-center justify-center gap-1.5">
                  <i className="bi bi-check-circle-fill" aria-hidden="true"></i> Pago verificado
                </div>
              ) : (
                pedido.estado_raw === 'PENDIENTE' && (
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenPayment(
                        'Inicial de Importación',
                        pedido.pago_inicial_usd_estimado,
                        pedido.pago_inicial_ves ||
                          (tasaActual ? pedido.pago_inicial_usd_estimado * parseFloat(tasaActual) : null)
                      )
                    }
                    className="mt-4 w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-colors text-xs sm:text-sm shadow-sm"
                  >
                    <i className="bi bi-wallet2 mr-1.5" aria-hidden="true"></i> Reportar Pago Inicial
                  </button>
                )
              )}
            </div>

            {/* Restante 50% */}
            <div
              className={`border rounded-2xl p-5 text-left flex flex-col justify-between ${
                pedido.estado_raw === 'LISTO_RETIRAR'
                  ? 'bg-primary-50/20 dark:bg-primary-950/10 border-primary-300 dark:border-primary-800'
                  : pedido.estado_raw === 'ENTREGADO'
                  ? 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-200/70 dark:border-emerald-900/40'
                  : 'bg-gray-50/50 dark:bg-gray-950/30 border-gray-200/80 dark:border-gray-800'
              }`}
            >
              <div>
                <div className="flex justify-between items-center text-xs font-bold text-gray-900 dark:text-white mb-3">
                  <span>
                    <i className="bi bi-box-arrow-in-down mr-1.5 text-primary-600 dark:text-primary-400" aria-hidden="true"></i>
                    Saldo Contra Entrega (50%)
                  </span>
                  {pedido.estado_raw === 'LISTO_RETIRAR' ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-primary-600 text-white">
                      Disponible para pago
                    </span>
                  ) : pedido.estado_raw === 'ENTREGADO' ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                      Liquidado
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-gray-200/70 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      En espera
                    </span>
                  )}
                </div>
                <p className="text-2xl font-black text-gray-900 dark:text-white">
                  ${pedido.saldo_pendiente_usd_estimado.toFixed(2)}
                </p>

                {pedido.estado_raw === 'LISTO_RETIRAR' && tasaActual ? (
                  <p className="text-xs font-bold text-primary-600 dark:text-primary-400 mt-1">
                    ≈ {(pedido.saldo_pendiente_usd_estimado * parseFloat(tasaActual)).toFixed(2)} Bs
                  </p>
                ) : pedido.estado_raw === 'ENTREGADO' && pedido.saldo_pendiente_ves ? (
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">
                    ≈ {pedido.saldo_pendiente_ves.toFixed(2)} Bs
                  </p>
                ) : (
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mt-1">
                    <i className="bi bi-lock mr-1" aria-hidden="true"></i> Se liquida al llegar a sede
                  </p>
                )}
              </div>

              {pedido.estado_pago === 'PENDIENTE' && pedido.estado_raw === 'LISTO_RETIRAR' ? (
                <div className="mt-4 w-full py-2.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-bold text-center rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs flex items-center justify-center gap-1.5">
                  <i className="bi bi-hourglass-split" aria-hidden="true"></i> Pago en verificación
                </div>
              ) : pedido.estado_pago === 'VERIFICADO' && pedido.estado_raw === 'LISTO_RETIRAR' ? (
                <div className="mt-4 w-full py-2.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold text-center rounded-xl border border-emerald-200 dark:border-emerald-900/50 text-xs flex items-center justify-center gap-1.5">
                  <i className="bi bi-check-circle-fill" aria-hidden="true"></i> Pago verificado
                </div>
              ) : (
                pedido.estado_raw === 'LISTO_RETIRAR' && (
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenPayment(
                        'Restante de Importación',
                        pedido.saldo_pendiente_usd_estimado,
                        tasaActual ? pedido.saldo_pendiente_usd_estimado * parseFloat(tasaActual) : null
                      )
                    }
                    className="mt-4 w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-colors text-xs sm:text-sm shadow-sm"
                  >
                    <i className="bi bi-wallet2 mr-1.5" aria-hidden="true"></i> Pagar Restante
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Lista de Artículos */}
        <div className="border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 sm:p-6 mb-6 text-left">
          <h2 className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-gray-800 pb-3">
            <i className="bi bi-boxes text-primary-600 dark:text-primary-400" aria-hidden="true"></i> Artículos Incluidos
          </h2>

          {pedido.productos && pedido.productos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-gray-200/80 dark:border-gray-800 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    <th className="pb-3 w-10">#</th>
                    <th className="pb-3 w-32">Tienda</th>
                    <th className="pb-3">Enlace</th>
                    <th className="pb-3 text-right w-24">Precio</th>
                    <th className="pb-3 text-center w-24">Peso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50 font-semibold">
                  {pedido.productos.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-950/30 transition-colors">
                      <td className="py-3 text-gray-400">{idx + 1}</td>
                      <td className="py-3">
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 uppercase tracking-wider border border-gray-200/60 dark:border-gray-700">
                          {item.tienda || 'Web'}
                        </span>
                      </td>
                      <td className="py-3">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1 text-xs font-bold"
                        >
                          <i className="bi bi-link-45deg text-sm" aria-hidden="true"></i> Ver Enlace Original
                        </a>
                      </td>
                      <td className="py-3 text-right text-gray-900 dark:text-white font-bold">
                        ${parseFloat(item.precio.toString()).toFixed(2)}
                      </td>
                      <td className="py-3 text-center text-gray-500 dark:text-gray-400">
                        {item.peso ? `${item.peso} Lbs` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-3 font-medium">
              No se encontraron artículos desglosados en este pedido.
            </p>
          )}
        </div>

        {/* Nota del Cliente */}
        {pedido.nota && (
          <div className="border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl p-5 text-left">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
              Observaciones / Nota
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium italic">
              &ldquo;{pedido.nota}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        concept={paymentConcept}
        amountUsd={paymentAmountUsd}
        amountVes={paymentAmountVes}
        orderCode={codigo || ''}
        clientName={pedido?.cliente_nombre || ''}
        orderType="importacion"
        onNotifyComplete={async () => {
          setIsPaymentModalOpen(false);
          await fetchDetalles();
        }}
      />
    </div>
  );
}
