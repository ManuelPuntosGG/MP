import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import PaymentModal from '../components/PaymentModal';

const STEPPER_STAGES = [
  { key: 'ESPERANDO', label: 'Espera', iconClass: 'bi bi-hourglass-split' },
  { key: 'RECIBIDO', label: 'Recibido', iconClass: 'bi bi-box-seam' },
  { key: 'DIAGNOSTICO', label: 'Diagnóstico', iconClass: 'bi bi-cpu' },
  { key: 'REPUESTOS', label: 'Reparación', iconClass: 'bi bi-tools' },
  { key: 'REPARADO', label: 'Listo', iconClass: 'bi bi-check-circle' },
];

interface Avance {
  fecha: string;
  descripcion: string;
  imagen?: string;
}

interface LineaPresupuesto {
  concepto: string;
  monto: string | number;
}

interface Ticket {
  codigo: string;
  estado: string;
  estado_raw: string;
  equipo: string;
  fecha_ingreso: string;
  falla_reportada: string;
  presupuesto_estado_raw: string;
  lineas_presupuesto: LineaPresupuesto[];
  total_usd: number;
  total_ves: number;
  tasa_ves: number;
  estado_pago?: 'PENDIENTE' | 'VERIFICADO' | null;
  avances: Avance[];
}

interface SolicitudExito {
  codigo: string;
  cliente_nombre: string;
  equipo: string;
}

interface FormErrors {
  cliente_nombre?: string;
  cliente_telefono?: string;
  equipo?: string;
  falla_reportada?: string;
  general?: string;
}

export default function Rastreo() {
  const { user, orders, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Search and Ticket State
  const [buscarCodigo, setBuscarCodigo] = useState<string>('');
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Solicitud (Registration) Form State
  const [showSolicitar, setShowSolicitar] = useState<boolean>(false);
  const [clienteNombre, setClienteNombre] = useState<string>('');
  const [clienteTelefono, setClienteTelefono] = useState<string>('');
  const [equipo, setEquipo] = useState<string>('');
  const [fallaReportada, setFallaReportada] = useState<string>('');
  const [submittingSolicitar, setSubmittingSolicitar] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [solicitudExito, setSolicitudExito] = useState<SolicitudExito | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedShipping, setCopiedShipping] = useState<boolean>(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'taller' | 'envio' | null>(null);

  // Confirmación integrada de presupuesto (evita window.confirm y alert)
  const [confirmingReject, setConfirmingReject] = useState<boolean>(false);
  const [presupuestoLoading, setPresupuestoLoading] = useState<boolean>(false);
  const [presupuestoError, setPresupuestoError] = useState<string | null>(null);

  // Lightbox State
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Modal Pago State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);

  // Leer código de la URL (?codigo=XXX o ?solicitar=true) al montar
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const codeParam = params.get('codigo');
    if (codeParam) {
      const codeUpper = codeParam.toUpperCase();
      setBuscarCodigo(codeUpper);
      fetchTicket(codeUpper);
    } else {
      setTicket(null);
    }
    if (params.get('solicitar') === 'true') {
      setShowSolicitar(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // Cargar datos por defecto del usuario autenticado en el formulario
  useEffect(() => {
    if (user && !showSolicitar) {
      setClienteNombre(user.nombre_completo || '');
      setClienteTelefono(user.telefono || '');
    }
  }, [user, showSolicitar]);

  // Cerrar modales con Escape y bloquear scroll de fondo (fixing-accessibility)
  useEffect(() => {
    const isModalOpen = showSolicitar || Boolean(solicitudExito) || Boolean(lightboxImg);
    if (!isModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxImg) {
          setLightboxImg(null);
        } else {
          setShowSolicitar(false);
          setSolicitudExito(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSolicitar, solicitudExito, lightboxImg]);

  // Polling de 30 segundos si el ticket está activo (no entregado ni cancelado)
  useEffect(() => {
    if (!ticket) return;
    const isTerminated = ticket.estado_raw === 'ENTREGADO' || ticket.estado_raw === 'CANCELADO';
    if (isTerminated) return;

    const interval = setInterval(() => {
      silentFetchTicket(ticket.codigo);
    }, 30000);

    return () => clearInterval(interval);
  }, [ticket]);

  const fetchTicket = async (code: string) => {
    setLoading(true);
    setError(null);
    setConfirmingReject(false);
    setPresupuestoError(null);
    try {
      const response = await api.get(`/ordenes/${code}/`);
      setTicket(response.data);
    } catch (err: any) {
      setTicket(null);
      setError(err.response?.data?.error || 'No se encontró ninguna orden con ese código.');
    } finally {
      setLoading(false);
    }
  };

  const silentFetchTicket = async (code: string) => {
    try {
      const response = await api.get(`/ordenes/${code}/`);
      setTicket(response.data);
    } catch (err) {
      console.error('Error polling ticket updates:', err);
    }
  };

  const handleBuscar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!buscarCodigo.trim()) return;
    const codeClean = buscarCodigo.trim().toUpperCase();
    navigate(`?codigo=${codeClean}`);
  };

  const handleSolicitar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmittingSolicitar(true);
    setFormErrors({});
    setSolicitudExito(null);
    setDeliveryMethod(null);

    try {
      const response = await api.post('/solicitar-reparacion/', {
        cliente_nombre: clienteNombre,
        cliente_telefono: clienteTelefono,
        equipo,
        falla_reportada: fallaReportada,
      });

      if (response.data.success) {
        if (user) refreshUser();
        setSolicitudExito({
          codigo: response.data.codigo,
          cliente_nombre: response.data.cliente_nombre,
          equipo: response.data.equipo,
        });
        setEquipo('');
        setFallaReportada('');
      }
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      } else {
        setFormErrors({
          general: err.response?.data?.error || 'Error al registrar la solicitud de reparación.',
        });
      }
    } finally {
      setSubmittingSolicitar(false);
    }
  };

  const handleResponderPresupuesto = async (accion: 'aprobar' | 'rechazar') => {
    if (!ticket) return;
    setPresupuestoLoading(true);
    setPresupuestoError(null);

    try {
      const response = await api.post('/responder-presupuesto/', {
        codigo: ticket.codigo,
        accion,
      });

      if (response.data.success) {
        setConfirmingReject(false);
        fetchTicket(ticket.codigo);
      }
    } catch (err: any) {
      setPresupuestoError(
        err.response?.data?.error || 'Error al procesar tu respuesta al presupuesto.'
      );
    } finally {
      setPresupuestoLoading(false);
    }
  };

  const getStageIndex = (estadoRaw: string) => {
    const list = ['ESPERANDO', 'RECIBIDO', 'DIAGNOSTICO', 'REPUESTOS', 'REPARADO', 'ENTREGADO'];
    return list.indexOf(estadoRaw);
  };

  const currentStageIndex = ticket ? getStageIndex(ticket.estado_raw) : -1;

  return (
    <div className="relative overflow-hidden pb-16">
      {/* Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-80 bg-primary-600/8 dark:bg-primary-600/12 blur-3xl rounded-full pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
        {/* Cabecera */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white">
              Órdenes de <span className="text-primary-600 dark:text-primary-400">Servicio</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1.5 font-medium">
              Consulta el estatus de tu equipo en laboratorio, revisa diagnósticos y aprueba presupuestos en línea.
            </p>
          </div>
          {!ticket && (
            <button
              type="button"
              onClick={() => {
                setShowSolicitar(true);
                setSolicitudExito(null);
              }}
              className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-900/50 hover:bg-primary-600 hover:text-white dark:hover:bg-primary-600 dark:hover:text-white text-xs sm:text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <i className="bi bi-file-earmark-plus" aria-hidden="true"></i>
              Registrar Nuevo Equipo
            </button>
          )}
        </div>

        {/* 1. Panel de Consulta Inicial (Buscar o Seleccionar Orden) */}
        {!ticket && (
          <div className="max-w-3xl mx-auto mt-4 space-y-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm animate-scale-in">
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center mx-auto mb-3 border border-primary-100 dark:border-primary-900/50">
                  <i className="bi bi-search text-lg" aria-hidden="true"></i>
                </div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">
                  Rastrear Orden por Código
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
                  Ingresa el código único entregado en tu ticket o pre-registro web.
                </p>
              </div>

              <form onSubmit={handleBuscar} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  required
                  aria-label="Código de rastreo"
                  value={buscarCodigo}
                  onChange={(e) => setBuscarCodigo(e.target.value.toUpperCase())}
                  className="flex-grow bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 font-mono font-bold tracking-widest text-center uppercase tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Ej. SRV-1234"
                />
                <button
                  type="submit"
                  disabled={loading || !buscarCodigo.trim()}
                  className="bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-gray-900 disabled:opacity-50"
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <i className="bi bi-search text-sm" aria-hidden="true"></i>
                  )}
                  <span>Consultar</span>
                </button>
              </form>

              {error && (
                <div
                  className="mt-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 text-xs sm:text-sm font-bold flex items-center gap-2 animate-fade-in"
                  role="alert"
                >
                  <i className="bi bi-exclamation-triangle-fill flex-shrink-0" aria-hidden="true"></i>
                  <span>{error}</span>
                </div>
              )}

              {/* Acceso directo a órdenes del usuario autenticado */}
              {user && orders.ordenes && orders.ordenes.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                    Tus órdenes recientes ({orders.ordenes.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {orders.ordenes.slice(0, 4).map((o) => (
                      <button
                        key={o.codigo}
                        type="button"
                        onClick={() => navigate(`?codigo=${o.codigo}`)}
                        className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-950 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 border border-gray-200/70 dark:border-gray-800 hover:border-primary-300 dark:hover:border-primary-800 transition-colors text-left group"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-mono text-xs font-black text-primary-600 dark:text-primary-400 block tabular-nums">
                            {o.codigo}
                          </span>
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate block">
                            {o.equipo || 'Equipo en servicio'}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 shrink-0">
                          {o.estado}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3 font-medium">
                  ¿Deseas ingresar un equipo al laboratorio para revisión o reparación?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowSolicitar(true);
                    setSolicitudExito(null);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-950/30 hover:border-primary-200 dark:hover:border-primary-900/50 hover:text-primary-600 dark:hover:text-primary-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <i className="bi bi-tools" aria-hidden="true"></i> Solicitar Reparación en Línea
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal del Formulario de nueva solicitud de reparación o Éxito */}
        {(showSolicitar || solicitudExito) &&
          createPortal(
            <div
              onClick={() => {
                setShowSolicitar(false);
                setSolicitudExito(null);
              }}
              className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in"
              role="dialog"
              aria-modal="true"
              aria-labelledby="solicitud-modal-title"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative max-h-[90dvh] overflow-y-auto flex flex-col animate-scale-in"
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowSolicitar(false);
                    setSolicitudExito(null);
                  }}
                  aria-label="Cerrar modal"
                  className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 z-10"
                >
                  <i className="bi bi-x-lg text-sm" aria-hidden="true"></i>
                </button>

                {showSolicitar && !solicitudExito && (
                  <div className="mt-1">
                    <h2 id="solicitud-modal-title" className="text-xl font-black text-gray-900 dark:text-white mb-1.5">
                      Solicitar <span className="text-primary-600 dark:text-primary-400">Reparación</span>
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed font-medium">
                      Completa los datos técnicos del equipo para pre-registrarlo. Obtendrás un código de seguimiento inmediato.
                    </p>

                    <form onSubmit={handleSolicitar} className="space-y-4" noValidate>
                      <div>
                        <label htmlFor="clienteNombre" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                          Nombre completo del cliente
                        </label>
                        <input
                          id="clienteNombre"
                          type="text"
                          autoComplete="name"
                          required
                          value={clienteNombre}
                          onChange={(e) => setClienteNombre(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 font-medium"
                          placeholder="Ej. Juan Pérez"
                        />
                        {formErrors.cliente_nombre && (
                          <p className="text-xs text-red-500 mt-1 font-bold" role="alert">
                            {formErrors.cliente_nombre}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="clienteTelefono" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                          WhatsApp / Teléfono de contacto
                        </label>
                        <input
                          id="clienteTelefono"
                          type="tel"
                          autoComplete="tel"
                          required
                          value={clienteTelefono}
                          onChange={(e) => setClienteTelefono(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 font-medium tabular-nums"
                          placeholder="Ej. 04241234567"
                        />
                        {formErrors.cliente_telefono && (
                          <p className="text-xs text-red-500 mt-1 font-bold" role="alert">
                            {formErrors.cliente_telefono}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="equipo" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                          Modelo de Equipo o Componente
                        </label>
                        <input
                          id="equipo"
                          type="text"
                          required
                          value={equipo}
                          onChange={(e) => setEquipo(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 font-medium"
                          placeholder="Ej. Laptop Asus ROG Strix / RTX 3070 EVGA"
                        />
                        {formErrors.equipo && (
                          <p className="text-xs text-red-500 mt-1 font-bold" role="alert">
                            {formErrors.equipo}
                          </p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="fallaReportada" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                          Descripción de la falla
                        </label>
                        <textarea
                          id="fallaReportada"
                          required
                          rows={3}
                          value={fallaReportada}
                          onChange={(e) => setFallaReportada(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 font-medium resize-y"
                          placeholder="Describe detalladamente el síntoma o problema que presenta el equipo..."
                        />
                        {formErrors.falla_reportada && (
                          <p className="text-xs text-red-500 mt-1 font-bold" role="alert">
                            {formErrors.falla_reportada}
                          </p>
                        )}
                      </div>

                      {formErrors.general && (
                        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold" role="alert">
                          {formErrors.general}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={submittingSolicitar}
                        className="w-full py-3.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-2"
                      >
                        {submittingSolicitar ? 'Registrando solicitud...' : 'Generar Orden de Servicio'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Éxito de pre-registro */}
                {solicitudExito && (
                  <div className="text-left mt-2 tabular-nums">
                    <div className="text-center mb-5">
                      <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-200/60 dark:border-emerald-900/50">
                        <i className="bi bi-check-lg text-2xl" aria-hidden="true"></i>
                      </div>
                      <h2 id="solicitud-modal-title" className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-1.5">
                        ¡Solicitud Registrada!
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                        Hola <strong className="text-gray-800 dark:text-gray-200">{solicitudExito.cliente_nombre}</strong>, hemos pre-registrado tu <strong className="text-gray-800 dark:text-gray-200">{solicitudExito.equipo}</strong>.
                      </p>
                    </div>

                    {/* Código destacado */}
                    <div className="text-center mb-5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                        Código Único de Rastreo
                      </p>
                      <div className="flex items-center justify-center gap-2 max-w-xs mx-auto bg-primary-50/70 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/50 rounded-2xl p-3">
                        <span className="font-mono text-2xl font-black tracking-widest text-primary-600 dark:text-primary-400">
                          {solicitudExito.codigo}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(solicitudExito.codigo);
                            setCopiedCode(true);
                            setTimeout(() => setCopiedCode(false), 2000);
                          }}
                          className="p-2 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-xl text-primary-600 dark:text-primary-400 transition-colors"
                          title="Copiar código"
                          aria-label="Copiar código de rastreo"
                        >
                          <i className={`bi ${copiedCode ? 'bi-check2 text-emerald-500' : 'bi-clipboard'}`} aria-hidden="true"></i>
                        </button>
                      </div>
                    </div>

                    {/* Caja siguiente paso */}
                    <div className="bg-gray-50 dark:bg-gray-950/50 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-4 mb-5">
                      <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white mb-2 text-sm">
                        <i className="bi bi-box-seam text-primary-600 dark:text-primary-400" aria-hidden="true"></i>
                        ¿Cómo entregarás tu equipo?
                      </div>

                      <div className="space-y-2 mt-3">
                        {/* Opción 1: Taller */}
                        <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                          <button
                            type="button"
                            onClick={() => setDeliveryMethod(deliveryMethod === 'taller' ? null : 'taller')}
                            aria-expanded={deliveryMethod === 'taller'}
                            className={`w-full flex items-center justify-between p-3 text-xs sm:text-sm font-bold text-left transition-colors ${
                              deliveryMethod === 'taller'
                                ? 'text-primary-600 dark:text-primary-400 bg-primary-50/30 dark:bg-primary-950/20'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <i className="bi bi-shop" aria-hidden="true"></i> Llevar personalmente al Taller (Naguanagua)
                            </span>
                            <i className={`bi bi-chevron-down transition-transform duration-200 ${deliveryMethod === 'taller' ? 'rotate-180' : ''}`} aria-hidden="true"></i>
                          </button>
                          {deliveryMethod === 'taller' && (
                            <div className="p-3.5 border-t border-gray-100 dark:border-gray-800 animate-slide-down">
                              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3 font-medium">
                                Ubicados en Carabobo, Naguanagua, Sector Tazajal, Res. Terrazas de Monte Alegre 1.
                              </p>
                              <a
                                href="https://maps.app.goo.gl/qnHXg1ArB95j4iq4A"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-xl text-xs font-bold border border-primary-100 dark:border-primary-900/50"
                              >
                                <i className="bi bi-geo-alt-fill" aria-hidden="true"></i> Abrir ubicación en Google Maps
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Opción 2: Envío */}
                        <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                          <button
                            type="button"
                            onClick={() => setDeliveryMethod(deliveryMethod === 'envio' ? null : 'envio')}
                            aria-expanded={deliveryMethod === 'envio'}
                            className={`w-full flex items-center justify-between p-3 text-xs sm:text-sm font-bold text-left transition-colors ${
                              deliveryMethod === 'envio'
                                ? 'text-primary-600 dark:text-primary-400 bg-primary-50/30 dark:bg-primary-950/20'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <i className="bi bi-truck" aria-hidden="true"></i> Envío Nacional (MRW / Tealca / Zoom)
                            </span>
                            <i className={`bi bi-chevron-down transition-transform duration-200 ${deliveryMethod === 'envio' ? 'rotate-180' : ''}`} aria-hidden="true"></i>
                          </button>
                          {deliveryMethod === 'envio' && (
                            <div className="p-3.5 border-t border-gray-100 dark:border-gray-800 space-y-3 animate-slide-down">
                              <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200/80 dark:border-gray-800 rounded-xl p-3 relative">
                                <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                  Datos del Receptor
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const datosTexto =
                                      'Receptor: Manuel García\nCédula: V-29685051\nTeléfono: 04245022292\nDestino: Valencia';
                                    navigator.clipboard.writeText(datosTexto);
                                    setCopiedShipping(true);
                                    setTimeout(() => setCopiedShipping(false), 2000);
                                  }}
                                  className="absolute top-2.5 right-2.5 text-xs font-bold px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 flex items-center gap-1"
                                >
                                  <i className={`bi ${copiedShipping ? 'bi-check2 text-emerald-500' : 'bi-files'}`} aria-hidden="true"></i>
                                  <span>{copiedShipping ? 'Copiado' : 'Copiar'}</span>
                                </button>
                                <div className="space-y-0.5 text-xs text-gray-700 dark:text-gray-300 font-medium">
                                  <p><strong className="text-gray-900 dark:text-white">Nombre:</strong> Manuel García</p>
                                  <p><strong className="text-gray-900 dark:text-white">Cédula:</strong> V-29685051</p>
                                  <p><strong className="text-gray-900 dark:text-white">Teléfono:</strong> 04245022292</p>
                                </div>
                              </div>

                              <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                                <p><strong className="text-gray-900 dark:text-white">MRW (Recomendada):</strong> Cód. 0816000 — Av. Bolívar Norte, Valencia</p>
                                <p><strong className="text-gray-900 dark:text-white">Tealca:</strong> Zona Industrial Norte 5208, Valencia</p>
                                <p><strong className="text-gray-900 dark:text-white">Zoom:</strong> Aliado ZOOM Omega Colors, Valencia</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <a
                        href={`https://wa.me/584245022292?text=${encodeURIComponent(
                          `Hola MP Tech, acabo de registrar una solicitud de soporte técnico. Código: ${solicitudExito.codigo}, Cliente: ${solicitudExito.cliente_nombre}, Equipo: ${solicitudExito.equipo}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3.5 flex items-center justify-center gap-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors text-xs sm:text-sm"
                      >
                        <i className="bi bi-whatsapp" aria-hidden="true"></i> Notificar Envío o Entrega por WhatsApp
                      </a>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setBuscarCodigo(solicitudExito.codigo);
                          navigate(`?codigo=${solicitudExito.codigo}`);
                          setSolicitudExito(null);
                          setShowSolicitar(false);
                        }}
                        className="flex-1 py-3 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl transition-colors text-xs sm:text-sm"
                      >
                        Ver Estado de mi Orden
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSolicitudExito(null);
                          setShowSolicitar(false);
                        }}
                        className="py-3 px-5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-bold transition-colors text-xs sm:text-sm"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>,
            document.body
          )}

        {/* 2. Detalle del Ticket Encontrado */}
        {ticket && (
          <div className="space-y-6 max-w-5xl mx-auto animate-slide-up tabular-nums">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setTicket(null);
                  setBuscarCodigo('');
                  navigate(location.pathname);
                }}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg px-2 py-1 -ml-2"
              >
                <i className="bi bi-arrow-left" aria-hidden="true"></i>
                Consultar otra orden
              </button>

              {!['ENTREGADO', 'CANCELADO'].includes(ticket.estado_raw) && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                  Sincronización en vivo
                </span>
              )}
            </div>

            {/* Tarjeta de Progreso Principal */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm">
              {/* Header del Ticket */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 dark:border-gray-800 mb-6 gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                    Orden de Servicio Técnico
                  </span>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-0.5 font-mono">
                    {ticket.codigo}
                  </h2>
                </div>
                <span
                  className={`inline-flex self-start sm:self-auto px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider border uppercase ${
                    ticket.estado_raw === 'REPARADO' || ticket.estado_raw === 'ENTREGADO'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50'
                      : ticket.estado_raw === 'CANCELADO'
                      ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50'
                      : ticket.estado_raw === 'DIAGNOSTICO' || ticket.estado_raw === 'REPUESTOS'
                      ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50'
                  }`}
                  role="status"
                >
                  {ticket.estado}
                </span>
              </div>

              {/* Renderizar Stepper o Caja de Cancelación */}
              {ticket.estado_raw === 'CANCELADO' ? (
                <div className="bg-red-50/70 dark:bg-red-950/25 border border-red-200 dark:border-red-900/40 rounded-2xl p-5 mb-8 flex items-start gap-3.5">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center flex-shrink-0">
                    <i className="bi bi-x-octagon text-lg" aria-hidden="true"></i>
                  </div>
                  <div>
                    <h3 className="font-black text-red-800 dark:text-red-400 text-base mb-1">
                      Orden Cerrada / Sin Reparación
                    </h3>
                    <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 leading-relaxed font-medium">
                      Esta orden ha sido cerrada. Revisa las observaciones técnicas detalladas en la bitácora inferior.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative mb-8 py-2" aria-label="Progreso de la reparación">
                  <div className="block relative">
                    <div className="absolute top-5 sm:top-6 left-[10%] right-[10%] h-0.5 bg-gray-200 dark:bg-gray-800 z-0">
                      <div
                        className="h-full bg-primary-600 transition-[width] duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            (Math.max(0, currentStageIndex) / (STEPPER_STAGES.length - 1)) * 100
                          )}%`,
                        }}
                        aria-hidden="true"
                      />
                    </div>

                    <div className="flex justify-between items-start sm:items-center relative z-10">
                      {STEPPER_STAGES.map((stage, idx) => {
                        const isCompleted = idx < currentStageIndex;
                        const isActive = idx === currentStageIndex;
                        return (
                          <div
                            key={stage.key}
                            className="flex flex-col items-center flex-1 px-0.5"
                            aria-current={isActive ? 'step' : undefined}
                          >
                            <div
                              className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm sm:text-base font-bold border transition-colors duration-200 ${
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
                              className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider mt-2.5 text-center leading-tight ${
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
                </div>
              )}

              {/* Resumen del Dispositivo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-950/50 border border-gray-200/60 dark:border-gray-800 p-5 rounded-2xl mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                    <i className="bi bi-cpu text-base" aria-hidden="true"></i>
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      Dispositivo / Hardware
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 block">
                      {ticket.equipo}
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                    <i className="bi bi-calendar-event text-base" aria-hidden="true"></i>
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      Fecha de Ingreso
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 block">
                      {new Date(ticket.fecha_ingreso).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Falla Declarada */}
              <div className="border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 mb-6">
                <h3 className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
                  <i className="bi bi-exclamation-triangle-fill text-amber-500 text-sm" aria-hidden="true"></i> Síntoma / Falla Reportada
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                  {ticket.falla_reportada || 'Sin descripción adicional.'}
                </p>
              </div>

              {/* Relación de Presupuesto */}
              {ticket.presupuesto_estado_raw !== 'SIN_PRESUPUESTO' && (
                <div className="border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 sm:p-6 mb-6 bg-gray-50/30 dark:bg-gray-950/30">
                  <h3 className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                    <i className="bi bi-cash-coin text-emerald-600 dark:text-emerald-400 text-base" aria-hidden="true"></i> Presupuesto de Servicio
                  </h3>

                  <div className="overflow-x-auto mb-5">
                    <table className="w-full text-left border-collapse tabular-nums">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-800 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          <th className="pb-2.5">Concepto / Repuesto</th>
                          <th className="pb-2.5 text-right">Monto ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50 text-sm font-semibold">
                        {ticket.lineas_presupuesto.map((linea, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 text-gray-600 dark:text-gray-300">{linea.concepto}</td>
                            <td className="py-2.5 text-right text-gray-900 dark:text-white font-bold">
                              ${parseFloat(linea.monto.toString()).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                        <tr className="font-bold text-base border-t-2 border-gray-200 dark:border-gray-800">
                          <td className="pt-3.5 text-gray-900 dark:text-white">Total Presupuestado:</td>
                          <td className="pt-3.5 text-right text-primary-600 dark:text-primary-500 font-black">
                            ${ticket.total_usd.toFixed(2)}
                            <span className="block text-xs text-gray-500 dark:text-gray-400 font-semibold mt-0.5">
                              ≈ {ticket.total_ves.toFixed(2)} Bs
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {presupuestoError && (
                    <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold" role="alert">
                      {presupuestoError}
                    </div>
                  )}

                  {/* Acciones de Presupuesto */}
                  {ticket.presupuesto_estado_raw === 'PENDIENTE' &&
                    !['REPARADO', 'ENTREGADO', 'CANCELADO'].includes(ticket.estado_raw) && (
                      <div className="space-y-3">
                        {!confirmingReject ? (
                          <>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                              Aprueba el presupuesto para iniciar la reparación de tu equipo, o recházalo para retirarlo sin cargos.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2.5">
                              <button
                                type="button"
                                disabled={presupuestoLoading}
                                onClick={() => handleResponderPresupuesto('aprobar')}
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-1.5 text-xs sm:text-sm disabled:opacity-50"
                              >
                                <i className="bi bi-check-circle-fill" aria-hidden="true"></i> Aprobar Presupuesto
                              </button>
                              <button
                                type="button"
                                disabled={presupuestoLoading}
                                onClick={() => setConfirmingReject(true)}
                                className="py-3 px-5 bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 text-xs sm:text-sm disabled:opacity-50"
                              >
                                <i className="bi bi-x-circle" aria-hidden="true"></i> Rechazar
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="p-4 rounded-xl bg-red-50/80 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 space-y-3 animate-fade-in">
                            <p className="text-xs sm:text-sm font-bold text-red-800 dark:text-red-300">
                              ¿Confirmas el rechazo del presupuesto? El proceso técnico se detendrá para que retires tu equipo sin reparar.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                type="button"
                                disabled={presupuestoLoading}
                                onClick={() => handleResponderPresupuesto('rechazar')}
                                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs sm:text-sm transition-colors"
                              >
                                {presupuestoLoading ? 'Procesando...' : 'Sí, rechazar presupuesto'}
                              </button>
                              <button
                                type="button"
                                disabled={presupuestoLoading}
                                onClick={() => setConfirmingReject(false)}
                                className="px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs sm:text-sm transition-colors"
                              >
                                Volver atrás
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  {ticket.presupuesto_estado_raw === 'APROBADO' &&
                    !['REPARADO', 'ENTREGADO', 'CANCELADO'].includes(ticket.estado_raw) && (
                      <div className="bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200/70 dark:border-emerald-900/50 p-3.5 rounded-xl text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-2">
                        <i className="bi bi-check-circle-fill" aria-hidden="true"></i> Presupuesto aprobado. Tu equipo se encuentra en línea de trabajo.
                      </div>
                    )}

                  {ticket.presupuesto_estado_raw === 'RECHAZADO' &&
                    !['REPARADO', 'ENTREGADO', 'CANCELADO'].includes(ticket.estado_raw) && (
                      <div className="bg-red-50/70 dark:bg-red-950/25 border border-red-200/70 dark:border-red-900/50 p-3.5 rounded-xl text-xs sm:text-sm font-bold text-red-700 dark:text-red-400 flex items-center justify-center gap-2">
                        <i className="bi bi-x-circle-fill" aria-hidden="true"></i> Presupuesto rechazado. Comunícate para coordinar el retiro del equipo.
                      </div>
                    )}

                  {['REPARADO', 'ENTREGADO'].includes(ticket.estado_raw) && ticket.total_usd > 0 && (
                    <div className="mt-5 border-t border-gray-200/60 dark:border-gray-800 pt-5">
                      {ticket.estado_pago === 'PENDIENTE' ? (
                        <div className="w-full py-3 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-bold rounded-xl border border-amber-200 dark:border-amber-900/50 flex items-center justify-center gap-2 text-xs sm:text-sm">
                          <i className="bi bi-hourglass-split" aria-hidden="true"></i> Pago en verificación
                        </div>
                      ) : ticket.estado_pago === 'VERIFICADO' ? (
                        <div className="w-full py-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold rounded-xl border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center gap-2 text-xs sm:text-sm">
                          <i className="bi bi-check-circle-fill" aria-hidden="true"></i> Pago verificado exitosamente
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsPaymentModalOpen(true)}
                          className="w-full py-3.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-sm"
                        >
                          <i className="bi bi-wallet2" aria-hidden="true"></i> Reportar Pago y Notificar Retiro
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Bitácora Técnica (Avances) */}
              <div>
                <h3 className="flex items-center gap-2 text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-5">
                  <i className="bi bi-journal-text text-base text-primary-600 dark:text-primary-400" aria-hidden="true"></i> Bitácora de Progreso Técnico ({ticket.avances.length})
                </h3>

                {ticket.avances.length === 0 ? (
                  <div className="border border-dashed border-gray-200 dark:border-gray-800 p-8 rounded-2xl text-center text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                    <i className="bi bi-clock-history text-2xl mb-2 block text-gray-300 dark:text-gray-700" aria-hidden="true"></i>
                    Tu dispositivo está en turno de inspección inicial. Los avances y fotografías del técnico aparecerán aquí.
                  </div>
                ) : (
                  <div className="relative pl-6 border-l-2 border-gray-200 dark:border-gray-800 space-y-6">
                    {ticket.avances.map((avance, idx) => (
                      <div key={idx} className="relative group">
                        <div
                          className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-primary-600 ring-4 ring-white dark:ring-gray-900"
                          aria-hidden="true"
                        />

                        <div className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1.5">
                          <i className="bi bi-clock" aria-hidden="true"></i>
                          {new Date(avance.fecha).toLocaleString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>

                        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed font-medium">
                          {avance.descripcion}
                        </p>

                        {avance.imagen && (
                          <div className="mt-3 max-w-xs rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 group/img relative">
                            <button
                              type="button"
                              onClick={() => setLightboxImg(avance.imagen || null)}
                              className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 relative"
                              aria-label={`Ampliar fotografía técnica: ${avance.descripcion}`}
                            >
                              <img
                                src={avance.imagen}
                                alt="Evidencia fotográfica técnica"
                                loading="lazy"
                                className="w-full h-auto object-cover max-h-48 group-hover/img:scale-105 transition-transform duration-300"
                              />
                              <span className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/70 text-white text-[10px] font-bold flex items-center gap-1">
                                <i className="bi bi-zoom-in" aria-hidden="true"></i> Ampliar
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. Lightbox Modal */}
        {lightboxImg &&
          createPortal(
            <div
              onClick={() => setLightboxImg(null)}
              className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 cursor-zoom-out animate-fade-in backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-label="Vista ampliada de imagen técnica"
            >
              <button
                type="button"
                onClick={() => setLightboxImg(null)}
                className="absolute top-5 right-5 text-white/80 hover:text-white p-2 text-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full bg-white/10 hover:bg-white/20 w-11 h-11 flex items-center justify-center"
                title="Cerrar vista (Esc)"
                aria-label="Cerrar vista ampliada"
              >
                <i className="bi bi-x-lg" aria-hidden="true"></i>
              </button>
              <img
                src={lightboxImg}
                alt="Microfotografía de hardware ampliada"
                className="max-w-full max-h-[88dvh] object-contain rounded-xl shadow-2xl animate-scale-in"
                onClick={(e) => e.stopPropagation()}
              />
            </div>,
            document.body
          )}

        {/* 4. Modal de Pago (para tickets REPARADO) */}
        {ticket && (
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            amountUsd={ticket.total_usd}
            amountVes={ticket.total_ves}
            orderCode={ticket.codigo}
            clientName={user ? user.nombre_completo || 'Cliente' : 'Cliente'}
            concept="Servicio Técnico (Reparación)"
            orderType="servicio"
            onNotifyComplete={() => {
              setIsPaymentModalOpen(false);
              fetchTicket(ticket.codigo);
            }}
          />
        )}
      </div>
    </div>
  );
}
