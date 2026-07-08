import { useState, useEffect, useRef } from 'react';
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

export default function Rastreo() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Search and Ticket State
  const [buscarCodigo, setBuscarCodigo] = useState('');
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Solicitud (Registration) Form State
  const [showSolicitar, setShowSolicitar] = useState(false);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [equipo, setEquipo] = useState('');
  const [fallaReportada, setFallaReportada] = useState('');
  const [submittingSolicitar, setSubmittingSolicitar] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [solicitudExito, setSolicitudExito] = useState(null);

  // Lightbox State
  const [lightboxImg, setLightboxImg] = useState(null);

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

  const fetchTicket = async (code) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/ordenes/${code}/`);
      setTicket(response.data);
    } catch (err) {
      setTicket(null);
      setError(err.response?.data?.error || 'No se encontró la orden de servicio.');
    } finally {
      setLoading(false);
    }
  };

  const silentFetchTicket = async (code) => {
    try {
      const response = await api.get(`/ordenes/${code}/`);
      setTicket(response.data);
    } catch (err) {
      console.error('Error polling ticket updates:', err);
    }
  };

  const handleBuscar = (e) => {
    e.preventDefault();
    if (!buscarCodigo.trim()) return;
    const codeClean = buscarCodigo.trim().toUpperCase();
    navigate(`?codigo=${codeClean}`);
  };

  const handleSolicitar = async (e) => {
    e.preventDefault();
    setSubmittingSolicitar(true);
    setFormErrors({});
    setSolicitudExito(null);

    try {
      const response = await api.post('/solicitar-reparacion/', {
        cliente_nombre: clienteNombre,
        cliente_telefono: clienteTelefono,
        equipo,
        falla_reportada: fallaReportada
      });

      if (response.data.success) {
        setSolicitudExito(response.data.codigo);
        setEquipo('');
        setFallaReportada('');
      }
    } catch (err) {
      if (err.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      } else {
        alert(err.response?.data?.error || 'Error al registrar la solicitud de reparación.');
      }
    } finally {
      setSubmittingSolicitar(false);
    }
  };

  const handleResponderPresupuesto = async (accion) => {
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
    } catch (err) {
      alert(err.response?.data?.error || 'Error al procesar la respuesta al presupuesto.');
    }
  };

  const getStageIndex = (estadoRaw) => {
    const list = ['ESPERANDO', 'RECIBIDO', 'DIAGNOSTICO', 'REPUESTOS', 'REPARADO', 'ENTREGADO'];
    return list.indexOf(estadoRaw);
  };

  const currentStageIndex = ticket ? getStageIndex(ticket.estado_raw) : -1;

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 bg-gray-50/50 dark:bg-gray-950/20 transition-colors duration-300">
      
      {/* 1. Panel de Consulta Inicial (Buscar o Registrar) */}
      {!ticket && (
        <div className="max-w-xl mx-auto bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-6 sm:p-10 shadow-sm hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.25)] transition-all duration-300 animate-scale-in">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Rastrear Reparación</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              Ingresa tu código de seguimiento para ver el estado de tu equipo y presupuesto en tiempo real.
            </p>
          </div>

          <form onSubmit={handleBuscar} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              required
              value={buscarCodigo}
              onChange={e => setBuscarCodigo(e.target.value.toUpperCase())}
              className="flex-grow bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3.5 text-gray-900 dark:text-white placeholder-gray-400 font-mono font-bold tracking-widest text-center focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all"
              placeholder="CÓDIGO DE ORDEN"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-gray-900 hover:bg-rose-600 dark:bg-white dark:text-gray-900 dark:hover:bg-rose-600 dark:hover:text-white text-white font-bold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              Buscar
            </button>
          </form>

          {error && (
            <div className="mt-5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 text-sm font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {error}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">¿No tienes código o deseas ingresar un nuevo equipo?</p>
            <button
              onClick={() => { setShowSolicitar(!showSolicitar); setSolicitudExito(null); }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 dark:border-gray-800 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:border-rose-100 dark:hover:border-rose-900/50 hover:text-rose-600 dark:hover:text-rose-400 transition-all"
            >
              <i className="bi bi-tools mr-1"></i> Registrar Equipo en Línea
            </button>
          </div>

          {/* Formulario de nueva solicitud de reparación */}
          {showSolicitar && !solicitudExito && (
            <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 animate-slide-up">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Pre-registrar Equipo</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                Completa los datos técnicos del equipo para pre-registrarlo. El diagnóstico inicial en taller no genera cargos.
              </p>

              <form onSubmit={handleSolicitar} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Nombre completo del cliente</label>
                  <input
                    type="text"
                    required
                    value={clienteNombre}
                    onChange={e => setClienteNombre(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all font-semibold"
                    placeholder="Ej. Juan Pérez"
                  />
                  {formErrors.cliente_nombre && <p className="text-xs text-rose-500 mt-1.5 font-bold">⚠️ {formErrors.cliente_nombre}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">WhatsApp / Teléfono de contacto</label>
                  <input
                    type="text"
                    required
                    value={clienteTelefono}
                    onChange={e => setClienteTelefono(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all font-semibold"
                    placeholder="Ej. 04241234567"
                  />
                  {formErrors.cliente_telefono && <p className="text-xs text-rose-500 mt-1.5 font-bold">⚠️ {formErrors.cliente_telefono}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Modelo de Equipo o Componente</label>
                  <input
                    type="text"
                    required
                    value={equipo}
                    onChange={e => setEquipo(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all font-semibold"
                    placeholder="Ej. Laptop Asus ROG Strix / RTX 3070 EVGA"
                  />
                  {formErrors.equipo && <p className="text-xs text-rose-500 mt-1.5 font-bold">⚠️ {formErrors.equipo}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Descripción de la falla</label>
                  <textarea
                    required
                    rows={4}
                    value={fallaReportada}
                    onChange={e => setFallaReportada(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all font-semibold"
                    placeholder="Describe detalladamente el problema que presenta el equipo..."
                  />
                  {formErrors.falla_reportada && <p className="text-xs text-rose-500 mt-1.5 font-bold">⚠️ {formErrors.falla_reportada}</p>}
                </div>

                <button
                  type="submit"
                  disabled={submittingSolicitar}
                  className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all shadow-md shadow-rose-600/30 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submittingSolicitar ? 'Registrando...' : 'Registrar Solicitud de Reparación'}
                </button>
              </form>
            </div>
          )}

          {/* Éxito de pre-registro */}
          {solicitudExito && (
            <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800 text-center animate-scale-in">
              <div className="w-16 h-16 bg-green-50 dark:bg-green-950/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100 dark:border-green-900/50">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">¡Equipo Registrado!</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Usa este código para rastrear los avances técnicos y autorizar presupuestos:</p>
              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 py-3.5 px-6 rounded-2xl mb-6 inline-block">
                <span className="text-2xl font-mono font-black tracking-widest text-rose-650 dark:text-rose-400">{solicitudExito}</span>
              </div>
              <button
                onClick={() => {
                  setBuscarCodigo(solicitudExito);
                  navigate(`?codigo=${solicitudExito}`);
                  setSolicitudExito(null);
                  setShowSolicitar(false);
                }}
                className="block w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:bg-rose-650 dark:hover:bg-rose-600 dark:hover:text-white transition-all shadow-sm text-sm"
              >
                Ver Tracker de Equipo
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Detalle del Ticket Encontrado */}
      {ticket && (
        <div className="space-y-6 max-w-4xl mx-auto animate-slide-up">
          
          {/* Botón Volver */}
          <button
            onClick={() => {
              setTicket(null);
              setBuscarCodigo('');
              navigate(location.pathname);
            }}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-rose-600 hover:text-rose-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Consultar otra orden
          </button>

          {/* Tarjeta de Progreso Principal */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-10 shadow-sm transition-colors duration-300">
            
            {/* Header del Ticket */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-gray-100 dark:border-gray-800 mb-8 space-y-3 sm:space-y-0">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400">Talonario de Servicio</span>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-1">ORDEN {ticket.codigo}</h2>
              </div>
              <span className={`inline-flex px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider border uppercase
                ${ticket.estado_raw === 'REPARADO' || ticket.estado_raw === 'ENTREGADO' 
                  ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/40' 
                  : ''}
                ${ticket.estado_raw === 'CANCELADO' 
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/40' 
                  : ''}
                ${ticket.estado_raw === 'DIAGNOSTICO' || ticket.estado_raw === 'REPUESTOS' 
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-gray-900/40' 
                  : ''}
                ${ticket.estado_raw === 'ESPERANDO' || ticket.estado_raw === 'RECIBIDO' 
                  ? 'bg-amber-55 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-gray-900/40' 
                  : ''}
              `}>
                {ticket.estado}
              </span>
            </div>

            {/* Renderizar Stepper o Caja de Cancelación */}
            {ticket.estado_raw === 'CANCELADO' ? (
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-6 mb-8 flex items-start gap-4">
                <div className="p-2.5 bg-rose-100 dark:bg-rose-900/50 text-rose-600 rounded-xl flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h4 className="font-black text-rose-800 dark:text-rose-400 mb-1">Cerrada / No Reparable</h4>
                  <p className="text-sm text-rose-700 dark:text-rose-300 leading-relaxed">
                    Esta orden de servicio ha sido cancelada por razones técnicas. Puedes consultar el informe y las observaciones del operador técnico en el historial detallado de avances al final de esta página.
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative mb-12">
                {/* Horizontal Stepper (Desktop) */}
                <div className="hidden sm:block relative">
                  {/* Stepper Progress Bar Line */}
                  <div className="absolute top-5 left-[10%] right-[10%] h-1 bg-gray-100 dark:bg-gray-800 z-0">
                    <div 
                      className="h-full bg-rose-600 transition-all duration-500" 
                      style={{ width: `${(Math.max(0, currentStageIndex) / (STEPPER_STAGES.length - 1)) * 100}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center relative z-10">
                    {STEPPER_STAGES.map((stage, idx) => {
                      const isCompleted = idx < currentStageIndex;
                      const isActive = idx === currentStageIndex;
                      return (
                        <div key={stage.key} className="flex flex-col items-center flex-1">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold border transition-all duration-300
                            ${isCompleted 
                              ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-600/25' 
                              : ''}
                            ${isActive 
                              ? 'bg-white dark:bg-gray-900 border-rose-600 text-rose-600 dark:text-rose-400 ring-4 ring-rose-50 dark:ring-rose-900/30' 
                              : ''}
                            {!isCompleted && !isActive 
                              ? 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-400' 
                              : ''}
                          `}>
                            <i className={`${stage.iconClass} ${isCompleted ? 'text-white' : isActive ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'}`}></i>
                          </div>
                          <span className={`text-xs font-bold uppercase tracking-wider mt-3
                            ${isActive ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400 dark:text-gray-500'}
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
                      className="w-full bg-rose-600 transition-all duration-500" 
                      style={{ height: `${(Math.max(0, currentStageIndex) / (STEPPER_STAGES.length - 1)) * 100}%` }}
                    />
                  </div>

                  <div className="flex flex-col gap-6 relative z-10">
                    {STEPPER_STAGES.map((stage, idx) => {
                      const isCompleted = idx < currentStageIndex;
                      const isActive = idx === currentStageIndex;
                      return (
                        <div key={stage.key} className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold border transition-all duration-300 flex-shrink-0
                            ${isCompleted 
                              ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-600/25' 
                              : ''}
                            ${isActive 
                              ? 'bg-white dark:bg-gray-900 border-rose-600 text-rose-600 dark:text-rose-400 ring-4 ring-rose-50 dark:ring-rose-900/30' 
                              : ''}
                            {!isCompleted && !isActive 
                              ? 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-400' 
                              : ''}
                          `}>
                            <i className={`${stage.iconClass} ${isCompleted ? 'text-white' : isActive ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'}`}></i>
                          </div>
                          <div className="text-left">
                            <span className={`text-xs font-bold uppercase tracking-wider block
                              ${isActive ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400 dark:text-gray-500'}
                            `}>
                              {stage.label}
                            </span>
                            {isActive && (
                              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block mt-0.5">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-gray-50/50 dark:bg-gray-900/30 border border-gray-100 dark:border-gray-800 p-6 rounded-2xl mb-8">
              <div className="flex gap-3">
                <i className="bi bi-cpu text-lg text-rose-600 dark:text-rose-400"></i>
                <div>
                  <span className="block text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 text-left">Dispositivo / Hardware</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white mt-1 block text-left">{ticket.equipo}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <i className="bi bi-calendar-event text-lg text-rose-600 dark:text-rose-400"></i>
                <div>
                  <span className="block text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 text-left">Fecha de Recepción</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white mt-1 block text-left">
                    {new Date(ticket.fecha_ingreso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Falla Declarada */}
            <div className="border border-gray-150 dark:border-gray-800 rounded-2xl p-6 mb-8 hover:border-rose-100 dark:hover:border-rose-900/30 transition-colors">
              <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
                <i className="bi bi-exclamation-triangle-fill text-amber-500 text-lg"></i> Falla Reportada por el Cliente
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                {ticket.falla_reportada || 'Ninguna falla descrita.'}
              </p>
            </div>

            {/* Relación de Presupuesto */}
            {ticket.presupuesto_estado_raw !== 'SIN_PRESUPUESTO' && (
              <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-8 bg-gray-50/10 hover:border-rose-100 dark:hover:border-rose-900/30 transition-colors">
                <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                  <i className="bi bi-cash-coin text-green-600 dark:text-green-400 text-lg"></i> Relación Presupuestaria de Servicio
                </h4>

                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-150 dark:border-gray-800 text-xs font-bold uppercase tracking-wider text-gray-450 dark:text-gray-500">
                        <th className="pb-3">Concepto de Reparación / Repuesto</th>
                        <th className="pb-3 text-right">Costo ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40 text-sm font-semibold">
                      {ticket.lineas_presupuesto.map((linea, idx) => (
                        <tr key={idx}>
                          <td className="py-3 text-gray-600 dark:text-gray-350">{linea.concepto}</td>
                          <td className="py-3 text-right text-gray-900 dark:text-white">${parseFloat(linea.monto).toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="font-bold text-base border-t-2 border-gray-200 dark:border-gray-800">
                        <td className="pt-4 text-gray-900 dark:text-white">Costo Total Estimado:</td>
                        <td className="pt-4 text-right text-rose-600 dark:text-rose-500">
                          ${ticket.total_usd.toFixed(2)}
                          <span className="block text-xs text-gray-400 dark:text-gray-500 font-medium mt-1">
                            ≈ {ticket.total_ves.toFixed(2)} Bs (Tasa de referencia)
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
                      Requerimos tu aprobación formal del presupuesto anterior para proceder a ordenar componentes e iniciar las labores en el taller.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => handleResponderPresupuesto('aprobar')}
                        className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all shadow-md shadow-green-600/30 flex items-center justify-center gap-1.5 text-sm"
                      >
                        <i className="bi bi-check-circle-fill mr-1.5"></i> Aceptar Presupuesto
                      </button>
                      <button
                        onClick={() => handleResponderPresupuesto('rechazar')}
                        className="flex-1 py-3 bg-rose-600 hover:bg-rose-550 text-white font-bold rounded-xl transition-all shadow-md shadow-rose-650/30 flex items-center justify-center gap-1.5 text-sm"
                      >
                        <i className="bi bi-x-circle-fill mr-1.5"></i> Rechazar
                      </button>
                    </div>
                  </div>
                )}

                {ticket.presupuesto_estado_raw === 'APROBADO' && (
                  <div className="bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/40 p-4 rounded-xl text-center text-sm font-bold text-green-700 dark:text-green-400 flex items-center justify-center gap-1.5 leading-relaxed">
                    <i className="bi bi-check-circle-fill mr-1.5"></i> ¡Presupuesto Aprobado! Tu equipo se encuentra asignado a la línea de trabajo activo del taller.
                  </div>
                )}

                {ticket.presupuesto_estado_raw === 'RECHAZADO' && (
                  <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 p-4 rounded-xl text-center text-sm font-bold text-rose-700 dark:text-rose-455 flex items-center justify-center gap-1.5 leading-relaxed">
                    <i className="bi bi-x-circle-fill mr-1.5"></i> Presupuesto Rechazado. Las reparaciones están suspendidas. Por favor, comunícate con soporte para coordinar el retiro de tu dispositivo.
                  </div>
                )}
              </div>
            )}

            {/* Bitácora Técnica (Avances) */}
            <div>
              <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6">
                <i className="bi bi-journal-text text-lg text-rose-600 dark:text-rose-400"></i> Bitácora Técnica e Informes de Avance
              </h4>

              {ticket.avances.length === 0 ? (
                <div className="border border-dashed border-gray-200 dark:border-gray-800 p-8 rounded-2xl text-center text-gray-500 dark:text-gray-400">
                  <i className="bi bi-gear-fill text-3xl mb-3 block text-gray-400 dark:text-gray-650"></i>
                  Tu dispositivo está en cola para inspección visual y mediciones iniciales. Los informes de los técnicos se actualizarán aquí.
                </div>
              ) : (
                <div className="relative pl-6 border-l-2 border-gray-100 dark:border-gray-800 space-y-6">
                  {ticket.avances.map((avance, idx) => (
                    <div key={idx} style={{ animationDelay: `${idx * 80}ms` }} className="relative group animate-slide-up">
                      
                      {/* Timeline Dot */}
                      <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-rose-600 border-4 border-white dark:border-gray-900 transition-transform group-hover:scale-125 duration-300" />
                      
                      <div className="text-xs font-bold text-gray-400 dark:text-gray-550 mb-1 flex items-center gap-1.5">
                        <i className="bi bi-clock text-xs"></i>
                        {new Date(avance.fecha).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>

                      <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-semibold">
                        {avance.descripcion}
                      </div>

                      {avance.imagen && (
                        <div className="mt-3.5 max-w-xs rounded-xl overflow-hidden border border-gray-150 dark:border-gray-800 cursor-zoom-in group/img relative shadow-sm">
                          <img
                            src={avance.imagen}
                            alt="Microfotografía técnica"
                            onClick={() => setLightboxImg(avance.imagen)}
                            className="w-full h-auto object-cover max-h-48 group-hover/img:scale-105 transition-all duration-350"
                          />
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
      {lightboxImg && (
        <div 
          onClick={() => setLightboxImg(null)}
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <button
            onClick={() => setLightboxImg(null)}
            className="absolute top-6 right-6 text-white/80 hover:text-white p-2 text-2xl transition-all"
            title="Cerrar modal"
          >
            ✖
          </button>
          <img
            src={lightboxImg}
            alt="Microfotografía de hardware ampliada"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-scale-in"
          />
        </div>
      )}

    </div>
  );
}
