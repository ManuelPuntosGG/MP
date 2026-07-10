import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

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
}

export default function Rastreo() {
  const { user } = useAuth();
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

  // Lightbox State
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Leer código de la URL (?codigo=XXX o ?solicitar=true) al montar
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const codeParam = params.get('codigo');
    if (codeParam) {
      const codeUpper = codeParam.toUpperCase();
      setBuscarCodigo(codeUpper);
      fetchTicket(codeUpper);
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

  // Polling de 30 segundos si el ticket está activo (no entregado ni cancelado)
  useEffect(() => {
    if (!ticket) return;
    const isTerminated =
      ticket.estado_raw === 'ENTREGADO' ||
      ticket.estado_raw === 'CANCELADO';

    if (isTerminated) return;

    const interval = setInterval(() => {
      silentFetchTicket(ticket.codigo);
    }, 30000);

    return () => clearInterval(interval);
  }, [ticket]);

  const fetchTicket = async (code: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/ordenes/${code}/`);
      setTicket(response.data);
    } catch (err: any) {
      setTicket(null);
      setError(err.response?.data?.error || 'No se encontró la orden de servicio.');
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
        falla_reportada: fallaReportada
      });

      if (response.data.success) {
        setSolicitudExito({
          codigo: response.data.codigo,
          cliente_nombre: response.data.cliente_nombre,
          equipo: response.data.equipo
        });
        setEquipo('');
        setFallaReportada('');
      }
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      } else {
        alert(err.response?.data?.error || 'Error al registrar la solicitud de reparación.');
      }
    } finally {
      setSubmittingSolicitar(false);
    }
  };

  const handleResponderPresupuesto = async (accion: 'aprobar' | 'rechazar') => {
    if (!ticket) return;

    if (accion === 'rechazar') {
      const confirm = window.confirm(
        '¿Confirma el rechazo del presupuesto? El proceso operativo se detendrá y tendrás que retirar el hardware sin reparar.'
      );
      if (!confirm) return;
    }

    try {
      const response = await api.post('/responder-presupuesto/', {
        codigo: ticket.codigo,
        accion
      });

      if (response.data.success) {
        // Refrescar datos
        fetchTicket(ticket.codigo);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al procesar la respuesta al presupuesto.');
    }
  };

  const getStageIndex = (estadoRaw: string) => {
    const list = ['ESPERANDO', 'RECIBIDO', 'DIAGNOSTICO', 'REPUESTOS', 'REPARADO', 'ENTREGADO'];
    return list.indexOf(estadoRaw);
  };

  const currentStageIndex = ticket ? getStageIndex(ticket.estado_raw) : -1;

  return (
    <div className="relative max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 animate-fade-in">

      {/* Background glow just for Dark Mode */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[500px] bg-primary-600/10 dark:bg-primary-600/15 blur-[120px] rounded-full pointer-events-none" aria-hidden="true" />
      
      {/* Cabecera y Tasa */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 space-y-4 md:space-y-0">
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white">
              Ordenes de <span className="text-primary-600 dark:text-primary-400">Servicio</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
              Consulta el estatus de tu equipo en taller, revisa el diagnóstico técnico y aprueba o rechaza presupuestos de reparación.
            </p>
          </div>
        </div>
      <div className="pt-2 pb-2 transition-colors duration-200">
        {/* 1. Panel de Consulta Inicial (Buscar o Registrar) */}
        {!ticket && (
          <div className="max-w-6xl mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-10 shadow-sm hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.25)] transition-all duration-200 animate-scale-in">
            <div className="text-center mb-8">
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                Ingresa tu código de seguimiento para consultar el estatus de tu equipo en el taller.
              </p>
            </div>

            <form onSubmit={handleBuscar} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                required
                aria-label="Código de rastreo"
                value={buscarCodigo}
                onChange={e => setBuscarCodigo(e.target.value.toUpperCase())}
                className="flex-grow bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white placeholder-gray-400 font-mono font-bold tracking-widest text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-200"
                placeholder="(Ej. ABC123)"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-primary-600 hover:bg-primary-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-primary-600/20 hover:shadow-primary-500/50 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-gray-900 disabled:opacity-50 disabled:hover:-translate-y-0 active:scale-95"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
                Buscar
              </button>
            </form>

            {error && (
              <div className="mt-5 p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 text-sm font-semibold flex items-center gap-2 animate-fade-in">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {error}
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium">¿No tienes código o deseas ingresar un nuevo equipo?</p>
              <button
                type="button"
                onClick={() => { setShowSolicitar(true); setSolicitudExito(null); }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-950/20 hover:border-primary-100 dark:hover:border-primary-900/50 hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <i className="bi bi-tools mr-1" aria-hidden="true"></i> Registrar Solicitud en Línea
              </button>
            </div>
          </div>
        )}

        {/* Modal del Formulario de nueva solicitud de reparación o Éxito */}
        {(showSolicitar || solicitudExito) && createPortal(
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative transition-colors duration-200 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto flex flex-col">
              <button
                type="button"
                onClick={() => { setShowSolicitar(false); setSolicitudExito(null); }}
                aria-label="Cerrar modal"
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 z-10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              {showSolicitar && !solicitudExito && (
                <div className="animate-slide-up mt-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Solicitar <span className="text-primary-600 dark:text-primary-400">Reparación</span></h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed font-medium">
                    Completa los datos técnicos del equipo para pre-registrarlo. El diagnóstico inicial en taller no genera cargos.
                  </p>

                  <form onSubmit={handleSolicitar} className="space-y-4" noValidate>
                    <div>
                      <label htmlFor="clienteNombre" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Nombre completo del cliente</label>
                      <input
                        id="clienteNombre"
                        type="text"
                        required
                        value={clienteNombre}
                        onChange={e => setClienteNombre(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-200 font-semibold"
                        placeholder="Ej. Juan Pérez"
                      />
                      {formErrors.cliente_nombre && <p className="text-xs text-red-500 mt-1.5 font-bold animate-fade-in" role="alert">⚠️ {formErrors.cliente_nombre}</p>}
                    </div>

                    <div>
                      <label htmlFor="clienteTelefono" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">WhatsApp / Teléfono de contacto</label>
                      <input
                        id="clienteTelefono"
                        type="text"
                        required
                        value={clienteTelefono}
                        onChange={e => setClienteTelefono(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-200 font-semibold"
                        placeholder="Ej. 04241234567"
                      />
                      {formErrors.cliente_telefono && <p className="text-xs text-red-500 mt-1.5 font-bold animate-fade-in" role="alert">⚠️ {formErrors.cliente_telefono}</p>}
                    </div>

                    <div>
                      <label htmlFor="equipo" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Modelo de Equipo o Componente</label>
                      <input
                        id="equipo"
                        type="text"
                        required
                        value={equipo}
                        onChange={e => setEquipo(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-200 font-semibold"
                        placeholder="Ej. Laptop Asus ROG Strix / RTX 3070 EVGA"
                      />
                      {formErrors.equipo && <p className="text-xs text-red-500 mt-1.5 font-bold animate-fade-in" role="alert">⚠️ {formErrors.equipo}</p>}
                    </div>

                    <div>
                      <label htmlFor="fallaReportada" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Descripción de la falla</label>
                      <textarea
                        id="fallaReportada"
                        required
                        rows={4}
                        value={fallaReportada}
                        onChange={e => setFallaReportada(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 outline-none transition-all duration-200 font-semibold resize-y"
                        placeholder="Describe detalladamente el problema que presenta el equipo..."
                      />
                      {formErrors.falla_reportada && <p className="text-xs text-red-500 mt-1.5 font-bold animate-fade-in" role="alert">⚠️ {formErrors.falla_reportada}</p>}
                    </div>

                    <button
                      type="submit"
                      disabled={submittingSolicitar}
                      className="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl transition-all duration-200 shadow-md shadow-primary-600/30 hover:shadow-primary-500/50 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-gray-900 disabled:opacity-50 disabled:hover:-translate-y-0 active:scale-95 flex items-center justify-center gap-2 mt-2"
                    >
                      {submittingSolicitar ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Registrando...
                        </>
                      ) : 'Registrar Solicitud de Reparación'}
                    </button>
                  </form>
                </div>
              )}

              {/* Éxito de pre-registro */}
              {solicitudExito && (
                <div className="animate-scale-in text-left mt-4">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 dark:border-emerald-900/30">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">¡Ingreso Registrado con Éxito!</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed px-2 font-medium">
                      Estimado(a) <strong className="text-gray-800 dark:text-gray-200">{solicitudExito.cliente_nombre}</strong>, se ha cargado la solicitud de servicio del equipo (<strong className="text-gray-800 dark:text-gray-200">{solicitudExito.equipo}</strong>).
                    </p>
                  </div>

                  {/* Código destacado */}
                  <div className="text-center mb-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Código Único de Rastreo</p>
                    <div className="flex items-center justify-center gap-2 max-w-xs mx-auto bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/40 rounded-2xl p-3 transition-colors duration-200">
                      <span className="font-mono text-2xl font-black tracking-widest text-primary-600 dark:text-primary-400">{solicitudExito.codigo}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(solicitudExito.codigo);
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        }}
                        className="p-1.5 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-lg text-primary-600 dark:text-primary-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        title="Copiar código"
                        aria-label="Copiar código de rastreo"
                      >
                        {copiedCode ? <i className="bi bi-check2 text-emerald-500 font-bold" aria-hidden="true"></i> : <i className="bi bi-clipboard" aria-hidden="true"></i>}
                      </button>
                    </div>
                    <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 bg-primary-500/5 dark:bg-primary-500/10 px-3 py-1.5 rounded-full font-medium transition-colors duration-200">
                      <i className="bi bi-shield-exclamation" aria-hidden="true"></i>
                      Use este código para monitorear el diagnóstico.
                    </div>
                  </div>

                  {/* Caja siguiente paso */}
                  <div className="bg-gray-50 dark:bg-gray-950/40 border border-gray-200 dark:border-gray-800/80 rounded-2xl p-4 sm:p-5 mb-6 transition-colors duration-200">
                    <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white mb-3 text-sm sm:text-base">
                      <i className="bi bi-gear-fill text-primary-500 animate-spin-slow" aria-hidden="true"></i>
                      ¿Cómo vas a entregar tu equipo?
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed font-medium">
                      Selecciona la modalidad más conveniente para la consignación física de tu hardware en nuestro laboratorio:
                    </p>

                    <div className="space-y-2.5">
                      {/* Opción 1: Taller */}
                      <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-200">
                        <button
                          type="button"
                          onClick={() => setDeliveryMethod(deliveryMethod === 'taller' ? null : 'taller')}
                          className={`w-full flex items-center justify-between p-3.5 text-sm font-bold text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${deliveryMethod === 'taller' ? 'text-primary-600 bg-primary-50/20 dark:bg-primary-950/10' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}
                        >
                          <span className="flex items-center gap-2">
                            <i className="bi bi-shop" aria-hidden="true"></i> Traer directamente al Taller
                          </span>
                          <i className={`bi bi-chevron-down transition-transform duration-300 ${deliveryMethod === 'taller' ? 'rotate-180' : ''}`} aria-hidden="true"></i>
                        </button>
                        {deliveryMethod === 'taller' && (
                          <div className="p-4 border-t border-gray-100 dark:border-gray-800 animate-slide-down">
                            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed mb-3 font-medium">
                              Nos encontramos ubicados en el Estado Carabobo, municipio Naguanagua, Sector Tazajal.
                            </p>
                            <a
                              href="https://maps.app.goo.gl/qnHXg1ArB95j4iq4A"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-500/10 hover:bg-primary-100 dark:hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 rounded-lg text-xs font-bold transition-all duration-200 border border-primary-100/50 dark:border-primary-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            >
                              <i className="bi bi-geo-alt-fill" aria-hidden="true"></i> Ver Ruta en Google Maps
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Opción 2: Envío */}
                      <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900 transition-colors duration-200">
                        <button
                          type="button"
                          onClick={() => setDeliveryMethod(deliveryMethod === 'envio' ? null : 'envio')}
                          className={`w-full flex items-center justify-between p-3.5 text-sm font-bold text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${deliveryMethod === 'envio' ? 'text-primary-600 bg-primary-50/20 dark:bg-primary-950/10' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}
                        >
                          <span className="flex items-center gap-2">
                            <i className="bi bi-truck" aria-hidden="true"></i> Envío Nacional (Encomienda)
                          </span>
                          <i className={`bi bi-chevron-down transition-transform duration-300 ${deliveryMethod === 'envio' ? 'rotate-180' : ''}`} aria-hidden="true"></i>
                        </button>
                        {deliveryMethod === 'envio' && (
                          <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-4 animate-slide-down">
                            <div className="bg-gray-50 dark:bg-gray-950/60 border border-gray-200 dark:border-gray-800/80 rounded-xl p-3.5 relative">
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Datos del Receptor</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const datosTexto = "Receptor: Manuel García\nCédula: V-29685051\nTeléfono: 04245022292\nDestino: Valencia";
                                  navigator.clipboard.writeText(datosTexto);
                                  setCopiedShipping(true);
                                  setTimeout(() => setCopiedShipping(false), 2000);
                                }}
                                className={`absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${copiedShipping ? 'text-emerald-500 border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/40' : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 bg-white dark:bg-gray-900'}`}
                                aria-label="Copiar datos de envío"
                              >
                                {copiedShipping ? <><i className="bi bi-check-lg" aria-hidden="true"></i> Copiado</> : <><i className="bi bi-files" aria-hidden="true"></i> Copiar</>}
                              </button>
                              <div className="space-y-1 text-xs text-gray-700 dark:text-gray-300 font-medium">
                                <p><strong className="text-gray-900 dark:text-white">Nombre:</strong> Manuel García</p>
                                <p><strong className="text-gray-900 dark:text-white">Cédula:</strong> V-29685051</p>
                                <p><strong className="text-gray-900 dark:text-white">Teléfono:</strong> 04245022292</p>
                              </div>
                            </div>

                            <div>
                              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5">Agencias de Envío (Destino Valencia)</span>
                              <div className="space-y-2">
                                <div className="flex items-start gap-2 text-xs">
                                  <i className="bi bi-caret-right-fill text-emerald-500 mt-0.5" aria-hidden="true"></i>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <strong className="text-gray-900 dark:text-white">MRW</strong>
                                      <span className="text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-bold border border-emerald-500/20">Recomendada</span>
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Cód: 0816000 - Av. Bolivar Norte, Valencia</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2 text-xs">
                                  <i className="bi bi-caret-right-fill text-gray-400 dark:text-gray-600 mt-0.5" aria-hidden="true"></i>
                                  <div className="flex-1">
                                    <strong className="text-gray-900 dark:text-white">Tealca</strong>
                                    <p className="text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Zona Industrial Norte 5208, Valencia</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2 text-xs">
                                  <i className="bi bi-caret-right-fill text-gray-400 dark:text-gray-600 mt-0.5" aria-hidden="true"></i>
                                  <div className="flex-1">
                                    <strong className="text-gray-900 dark:text-white">Zoom</strong>
                                    <p className="text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Aliado ZOOM Omega Colors, Valencia</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botón WhatsApp */}
                    <a
                      href={`https://wa.me/584245022292?text=${encodeURIComponent(`Hola MP Tech, acabo de registrar una solicitud de soporte técnico. Código: ${solicitudExito.codigo}, Cliente: ${solicitudExito.cliente_nombre}, Equipo: ${solicitudExito.equipo}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all duration-200 shadow-md shadow-green-600/20 text-xs sm:text-sm hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
                    >
                      <i className="bi bi-whatsapp" aria-hidden="true"></i> Notificar Entrega por WhatsApp
                    </a>
                  </div>

                  {/* Botones de navegación final */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setBuscarCodigo(solicitudExito.codigo);
                        navigate(`?codigo=${solicitudExito.codigo}`);
                        setSolicitudExito(null);
                        setShowSolicitar(false);
                      }}
                      className="flex-1 py-3.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl transition-all duration-200 shadow-md shadow-primary-600/20 hover:shadow-primary-500/50 hover:-translate-y-0.5 text-center text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 active:scale-95"
                    >
                      Rastrear mi orden de servicio
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSolicitudExito(null);
                        setShowSolicitar(false);
                        navigate('/');
                      }}
                      className="py-3.5 px-6 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-bold transition-all duration-200 text-xs sm:text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                    >
                      <i className="bi bi-arrow-left mr-1" aria-hidden="true"></i> Volver al Inicio
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
      {/* 2. Detalle del Ticket Encontrado */}
      {ticket && (
        <div className="space-y-6 max-w-6xl mx-auto animate-slide-up">

          {/* Botón Volver */}
          <button
            type="button"
            onClick={() => {
              setTicket(null);
              setBuscarCodigo('');
              navigate(location.pathname);
            }}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-600 hover:text-primary-700 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md px-2 py-1 -ml-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Consultar otra orden
          </button>

          {/* Tarjeta de Progreso Principal */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-10 shadow-sm transition-colors duration-300">

            {/* Header del Ticket */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 dark:border-gray-800 mb-2 space-y-3 sm:space-y-0">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400">Consulta de Servicio</span>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">ORDEN {ticket.codigo}</h2>
              </div>
              <span className={`inline-flex px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider border uppercase transition-colors duration-200
                ${ticket.estado_raw === 'REPARADO' || ticket.estado_raw === 'ENTREGADO'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40'
                  : ''}
                ${ticket.estado_raw === 'CANCELADO'
                  ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/40'
                  : ''}
                ${ticket.estado_raw === 'DIAGNOSTICO' || ticket.estado_raw === 'REPUESTOS'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40'
                  : ''}
                ${ticket.estado_raw === 'ESPERANDO' || ticket.estado_raw === 'RECIBIDO'
                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40'
                  : ''}
              `} role="status">
                {ticket.estado}
              </span>
            </div>

            {/* Renderizar Stepper o Caja de Cancelación */}
            {ticket.estado_raw === 'CANCELADO' ? (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl p-6 mb-8 flex items-start gap-4 transition-colors duration-200">
                <div className="p-2.5 bg-red-100 dark:bg-red-900/50 text-red-600 rounded-xl flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h4 className="font-black text-red-800 dark:text-red-400 mb-1">Cerrada / No Reparable</h4>
                  <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed font-medium">
                    Esta orden de servicio ha sido cancelada por razones técnicas. Puedes consultar el informe y las observaciones del operador técnico en el historial detallado de avances al final de esta página.
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative mb-6" aria-label="Progreso de la reparación">
                {/* Horizontal Stepper (Desktop) */}
                <div className="hidden sm:block relative">
                  {/* Stepper Progress Bar Line */}
                  <div className="absolute top-5 left-[10%] right-[10%] h-1 bg-gray-100 dark:bg-gray-800 z-0">
                    <div
                      className="h-full bg-primary-600 transition-all duration-500"
                      style={{ width: `${(Math.max(0, currentStageIndex) / (STEPPER_STAGES.length - 1)) * 100}%` }}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="flex justify-between items-center relative z-10">
                    {STEPPER_STAGES.map((stage, idx) => {
                      const isCompleted = idx < currentStageIndex;
                      const isActive = idx === currentStageIndex;
                      return (
                        <div key={stage.key} className="flex flex-col items-center flex-1" aria-current={isActive ? 'step' : undefined}>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold border transition-all duration-300
                            ${isCompleted
                              ? 'bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-600/25'
                              : ''}
                            ${isActive
                              ? 'bg-white dark:bg-gray-900 border-primary-600 text-primary-600 dark:text-primary-400 ring-4 ring-primary-50 dark:ring-primary-900/30'
                              : ''}
                            {!isCompleted && !isActive 
                              ? 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-400' 
                              : ''}
                          `}>
                            <i className={`${stage.iconClass} ${isCompleted ? 'text-white' : isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`} aria-hidden="true"></i>
                          </div>
                          <span className={`text-xs font-bold uppercase tracking-wider mt-3
                            ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}
                          `}>
                            {stage.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Vertical Stepper (Mobile) */}
                <div className="block sm:hidden relative pl-6">
                  {/* Vertical progress line */}
                  <div className="absolute left-[48px] top-6 bottom-6 w-0.5 bg-gray-200 dark:bg-gray-800 z-0">
                    <div
                      className="w-full bg-primary-600 transition-all duration-500"
                      style={{ height: `${(Math.max(0, currentStageIndex) / (STEPPER_STAGES.length - 1)) * 100}%` }}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="flex flex-col gap-4 relative z-10">
                    {STEPPER_STAGES.map((stage, idx) => {
                      const isCompleted = idx < currentStageIndex;
                      const isActive = idx === currentStageIndex;
                      return (
                        <div key={stage.key} className="flex items-center gap-4" aria-current={isActive ? 'step' : undefined}>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold border transition-all duration-300 flex-shrink-0
                            ${isCompleted
                              ? 'bg-primary-600 border-primary-600 text-white shadow-md shadow-primary-600/25'
                              : ''}
                            ${isActive
                              ? 'bg-white dark:bg-gray-900 border-primary-600 text-primary-600 dark:text-primary-400 ring-4 ring-primary-50 dark:ring-primary-900/30'
                              : ''}
                            {!isCompleted && !isActive 
                              ? 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-400' 
                              : ''}
                          `}>
                            <i className={`${stage.iconClass} ${isCompleted ? 'text-white' : isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`} aria-hidden="true"></i>
                          </div>
                          <div className="text-left">
                            <span className={`text-xs font-bold uppercase tracking-wider block
                              ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}
                            `}>
                              {stage.label}
                            </span>
                            {isActive && (
                              <span className="text-[10px] text-primary-600 dark:text-primary-400 font-bold block mt-0.5 animate-pulse">
                                Estado Actual
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

            {/* Resumen del Dispositivo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800 p-6 rounded-2xl mb-8 transition-colors duration-200">
              <div className="flex gap-3">
                <i className="bi bi-cpu text-lg text-primary-600 dark:text-primary-400" aria-hidden="true"></i>
                <div>
                  <span className="block text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 text-left">Dispositivo / Hardware</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white mt-1 block text-left">{ticket.equipo}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <i className="bi bi-calendar-event text-lg text-primary-600 dark:text-primary-400" aria-hidden="true"></i>
                <div>
                  <span className="block text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 text-left">Fecha de Recepción</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white mt-1 block text-left">
                    {new Date(ticket.fecha_ingreso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Falla Declarada */}
            <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-8 hover:border-primary-100 dark:hover:border-primary-900/30 transition-colors duration-200">
              <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
                <i className="bi bi-exclamation-triangle-fill text-amber-500 text-lg" aria-hidden="true"></i> Falla Reportada
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                {ticket.falla_reportada || 'Ninguna falla descrita.'}
              </p>
            </div>

            {/* Relación de Presupuesto */}
            {ticket.presupuesto_estado_raw !== 'SIN_PRESUPUESTO' && (
              <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-8 bg-gray-50/10 hover:border-primary-100 dark:hover:border-primary-900/30 transition-colors duration-200">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                  <i className="bi bi-cash-coin text-emerald-600 dark:text-emerald-400 text-lg" aria-hidden="true"></i> Presupuesto de Servicio
                </h4>

                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        <th className="pb-3">Concepto / Repuesto</th>
                        <th className="pb-3 text-right">Costo ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40 text-sm font-semibold">
                      {ticket.lineas_presupuesto.map((linea, idx) => (
                        <tr key={idx} className="transition-colors duration-200">
                          <td className="py-3 text-gray-600 dark:text-gray-400">{linea.concepto}</td>
                          <td className="py-3 text-right text-gray-900 dark:text-white">${parseFloat(linea.monto.toString()).toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="font-bold text-base border-t-2 border-gray-200 dark:border-gray-800">
                        <td className="pt-4 text-gray-900 dark:text-white">Costo Total Estimado:</td>
                        <td className="pt-4 text-right text-primary-600 dark:text-primary-500">
                          ${ticket.total_usd.toFixed(2)}
                          <span className="block text-xs text-gray-400 dark:text-gray-500 font-medium mt-1">
                            ≈ {ticket.total_ves.toFixed(2)} Bs
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Acciones de Presupuesto */}
                {ticket.presupuesto_estado_raw === 'PENDIENTE' && (
                  <div className="space-y-4">
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                      Requerimos tu aprobación formal del presupuesto para proceder a ordenar componentes e iniciar las labores en el taller.
                      Si deseas rechazarlo, tu equipo estará disponible para retiro y no se realizarán reparaciones ni cargos adicionales.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => handleResponderPresupuesto('aprobar')}
                        className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all duration-200 shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5 text-sm hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 dark:focus-visible:ring-offset-gray-900 active:scale-95"
                      >
                        <i className="bi bi-check-circle-fill mr-1.5" aria-hidden="true"></i> Aceptar Presupuesto
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResponderPresupuesto('rechazar')}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all duration-200 shadow-md shadow-red-600/30 flex items-center justify-center gap-1.5 text-sm hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 dark:focus-visible:ring-offset-gray-900 active:scale-95"
                      >
                        <i className="bi bi-x-circle-fill mr-1.5" aria-hidden="true"></i> Rechazar
                      </button>
                    </div>
                  </div>
                )}

                {ticket.presupuesto_estado_raw === 'APROBADO' && (
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 p-4 rounded-xl text-center text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1.5 leading-relaxed transition-colors duration-200">
                    <i className="bi bi-check-circle-fill mr-1.5" aria-hidden="true"></i> ¡Presupuesto Aprobado! Tu equipo se encuentra asignado a la línea de trabajo activo del taller.
                  </div>
                )}

                {ticket.presupuesto_estado_raw === 'RECHAZADO' && (
                  <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 p-4 rounded-xl text-center text-sm font-bold text-red-700 dark:text-red-400 flex items-center justify-center gap-1.5 leading-relaxed transition-colors duration-200">
                    <i className="bi bi-x-circle-fill mr-1.5" aria-hidden="true"></i> Presupuesto Rechazado. Por favor, comunícate para coordinar el retiro de tu equipo.
                  </div>
                )}
              </div>
            )}

            {/* Bitácora Técnica (Avances) */}
            <div>
              <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6">
                <i className="bi bi-journal-text text-lg text-primary-600 dark:text-primary-400" aria-hidden="true"></i> Actualizaciones del Progreso Técnico
              </h4>

              {ticket.avances.length === 0 ? (
                <div className="border border-dashed border-gray-200 dark:border-gray-800 p-8 rounded-2xl text-center text-gray-500 dark:text-gray-400 transition-colors duration-200">
                  <i className="bi bi-gear-fill text-3xl mb-3 block text-gray-300 dark:text-gray-700" aria-hidden="true"></i>
                  Tu dispositivo está en cola para inspección visual y mediciones iniciales. Los informes de los técnicos se actualizarán aquí.
                </div>
              ) : (
                <div className="relative pl-6 border-l-2 border-gray-100 dark:border-gray-800 space-y-6">
                  {ticket.avances.map((avance, idx) => (
                    <div key={idx} style={{ animationDelay: `${idx * 80}ms` }} className="relative group animate-slide-up">

                      {/* Timeline Dot */}
                      <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-primary-600 border-4 border-white dark:border-gray-900 transition-transform duration-300 group-hover:scale-125" aria-hidden="true" />

                      <div className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-1 flex items-center gap-1.5">
                        <i className="bi bi-clock text-xs" aria-hidden="true"></i>
                        {new Date(avance.fecha).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>

                      <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-semibold">
                        {avance.descripcion}
                      </div>

                      {avance.imagen && (
                        <div className="mt-3.5 max-w-xs rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 cursor-zoom-in group/img relative shadow-sm">
                          <button
                            type="button"
                            onClick={() => setLightboxImg(avance.imagen || null)}
                            className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                            aria-label={`Ver imagen ampliada del avance técnico: ${avance.descripcion}`}
                          >
                            <img
                              src={avance.imagen}
                              alt="Microfotografía técnica"
                              className="w-full h-auto object-cover max-h-48 group-hover/img:scale-105 transition-transform duration-300"
                            />
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
      {lightboxImg && createPortal(
        <div
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 cursor-zoom-out animate-fade-in backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Vista ampliada de imagen"
        >
          <button
            type="button"
            onClick={() => setLightboxImg(null)}
            className="absolute top-6 right-6 text-white/80 hover:text-white p-2 text-2xl transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full bg-black/50 hover:bg-black/70 w-12 h-12 flex items-center justify-center"
            title="Cerrar modal"
            aria-label="Cerrar vista ampliada"
          >
            <i className="bi bi-x-lg" aria-hidden="true"></i>
          </button>
          <img
            src={lightboxImg}
            alt="Microfotografía de hardware ampliada"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}

    </div>
  );
}
