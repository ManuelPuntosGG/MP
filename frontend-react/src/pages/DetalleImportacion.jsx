import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';

const IMPORT_STAGES = [
  { key: 'PENDIENTE', label: 'Pendiente', iconClass: 'bi bi-clock' },
  { key: 'CONFIRMADA', label: 'Confirmada', iconClass: 'bi bi-check-lg' },
  { key: 'EN_TRANSITO_EXTERIOR', label: 'Tránsito Ext.', iconClass: 'bi bi-airplane' },
  { key: 'EN_TRANSITO_VENEZUELA', label: 'Tránsito Ven.', iconClass: 'bi bi-geo-alt' },
  { key: 'LISTO_RETIRAR', label: 'Listo Retiro', iconClass: 'bi bi-shop' },
];

export default function DetalleImportacion() {
  const { codigo } = useParams();
  const [pedido, setPedido] = useState(null);
  const [tasaActual, setTasaActual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetalles = async () => {
      try {
        setLoading(true);
        setError(null);
        const [pedidoRes, tasaRes] = await Promise.all([
          api.get(`/importaciones/${codigo}/`),
          api.get('/tasa/')
        ]);
        setPedido(pedidoRes.data);
        setTasaActual(tasaRes.data.tasa_ves);
      } catch (err) {
        console.error('Error cargando detalles de importación:', err);
        setError(err.response?.data?.error || 'No se pudo cargar la orden de importación.');
      } finally {
        setLoading(false);
      }
    };

    if (codigo) {
      fetchDetalles();
    }
  }, [codigo]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-gray-50/50 dark:bg-gray-950/20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (error || !pedido) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-900 border border-red-100 dark:border-red-950 p-8 rounded-3xl text-center shadow-md">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 text-red-550 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="bi bi-exclamation-triangle text-2xl"></i>
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4">Error al cargar la orden</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">{error || 'El pedido de importación solicitado no existe o no tiene autorización para verlo.'}</p>
          <Link to="/" className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:bg-rose-600 transition-colors shadow-sm">
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  // Encontrar el índice de etapa actual
  const currentStageIndex = IMPORT_STAGES.findIndex(s => s.key === pedido.estado_raw);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 bg-gray-50/50 dark:bg-gray-950/20 transition-colors duration-300">
      
      {/* Botón Volver */}
      <Link 
        to="/perfil" 
        className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-rose-600 dark:hover:text-rose-400 mb-8 transition-colors"
      >
        <i className="bi bi-arrow-left"></i> Volver al Perfil
      </Link>

      {/* Tarjeta de Contenedor de Resultados */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.1)] transition-all duration-300">
        
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 dark:border-gray-800 pb-6 mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 text-lg">
              <i className="bi bi-box-seam animate-pulse"></i>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              Importación {pedido.codigo}
            </h3>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border
            ${pedido.estado_raw === 'ENTREGADO' 
              ? 'bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900/40 text-green-700 dark:text-green-400' 
              : 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400'}`}
          >
            {pedido.estado}
          </span>
        </div>

        {/* Stepper de Estados */}
        <div className="mb-10">
          {pedido.estado_raw === 'ENTREGADO' ? (
            <div className="bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/40 p-5 rounded-2xl flex items-start gap-4">
              <i className="bi bi-check-circle-fill text-2xl text-green-500 mt-0.5 flex-shrink-0"></i>
              <div>
                <h4 className="text-base font-bold text-green-700 dark:text-green-400">Pedido Entregado con Éxito</h4>
                <p className="text-sm text-green-600/80 dark:text-green-500/80 mt-1 font-medium leading-relaxed">
                  Esta orden ha sido formalmente entregada y todos los montos correspondientes se encuentran debidamente liquidados.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative">
                   {/* Horizontal Stepper (Desktop) */}
              <div className="hidden sm:block relative py-4">
                <div className="absolute top-9 left-[10%] right-[10%] h-0.5 bg-gray-100 dark:bg-gray-800 z-0">
                  <div 
                    className="h-full bg-rose-600 transition-all duration-500" 
                    style={{ width: `${(Math.max(0, currentStageIndex) / (IMPORT_STAGES.length - 1)) * 100}%` }}
                  />
                </div>

                <div className="flex justify-between items-center relative z-10">
                  {IMPORT_STAGES.map((stage, idx) => {
                    const isCompleted = idx < currentStageIndex;
                    const isActive = idx === currentStageIndex;
                    return (
                      <div key={stage.key} className="flex flex-col items-center flex-1">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border transition-all duration-300
                          ${isCompleted 
                            ? 'bg-rose-600 border-rose-600 text-white shadow-md' 
                            : ''}
                          ${isActive 
                            ? 'bg-white dark:bg-gray-900 border-rose-600 text-rose-600 dark:text-rose-400 ring-4 ring-rose-50 dark:ring-rose-950/30' 
                            : ''}
                          {!isCompleted && !isActive 
                            ? 'bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-400' 
                            : ''}
                        `}>
                          <i className={`${stage.iconClass} ${isCompleted ? 'text-white' : isActive ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'}`}></i>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider mt-3
                          ${isActive ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400 dark:text-gray-500'}
                        `}>
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>                {/* Vertical Stepper (Mobile) */}
              <div className="block sm:hidden relative pl-6 py-2">
                <div className="absolute left-[48px] top-6 bottom-6 w-0.5 bg-gray-200 dark:bg-gray-800 z-0">
                  <div 
                    className="w-full bg-rose-600 transition-all duration-500" 
                    style={{ height: `${(Math.max(0, currentStageIndex) / (IMPORT_STAGES.length - 1)) * 100}%` }}
                  />
                </div>

                <div className="flex flex-col gap-6 relative z-10">
                  {IMPORT_STAGES.map((stage, idx) => {
                    const isCompleted = idx < currentStageIndex;
                    const isActive = idx === currentStageIndex;
                    return (
                      <div key={stage.key} className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-bold border transition-all duration-300 flex-shrink-0
                          ${isCompleted 
                            ? 'bg-rose-600 border-rose-600 text-white shadow-md' 
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
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block mt-0.5 animate-pulse">
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
        </div>

        {/* Resumen Rápido */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-gray-50/50 dark:bg-gray-950/30 border border-gray-100 dark:border-gray-800 p-6 rounded-2xl mb-8">
          <div className="text-left">
            <span className="block text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500"><i className="bi bi-calendar3 mr-1"></i> Fecha de Orden</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white mt-1.5 block">
              {new Date(pedido.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="text-left">
            <span className="block text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500"><i className="bi bi-fingerprint mr-1"></i> ID de Seguimiento</span>
            <span className="text-sm font-mono font-black text-rose-600 dark:text-rose-400 mt-1.5 block">
              {pedido.codigo}
            </span>
          </div>
          <div className="text-left">
            <span className="block text-xs font-bold uppercase tracking-widest text-gray-405 dark:text-gray-500"><i className="bi bi-receipt mr-1"></i> Total Estimado</span>
            <span className="text-base font-black text-gray-955 dark:text-white mt-1.5 block">
              ${pedido.total_usd.toFixed(2)}
              <span className="block text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">≈ {pedido.total_ves.toFixed(2)} Bs</span>
            </span>
          </div>
        </div>

        {/* Envio / Courier Card (Si carrier está disponible) */}
        {pedido.carrier_nombre && (
          <div className="border border-gray-205 dark:border-gray-800 rounded-2xl p-6 mb-8 bg-gray-50/10">
            <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              <i className="bi bi-truck text-rose-600 dark:text-rose-400"></i> Información de Tránsito Exterior
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="text-left">
                <span className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Transportadora (Courier)</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white mt-1 block">{pedido.carrier_nombre}</span>
              </div>
              {pedido.carrier_tracking && (
                <div className="text-left">
                  <span className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Código de Tracking Externo</span>
                  <span className="text-sm font-mono font-bold text-rose-600 dark:text-rose-405 mt-1 block">{pedido.carrier_tracking}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Paneles de Pago Detallado */}
        <div className="mb-8">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-6">
            <i className="bi bi-credit-card-2-back text-rose-600 dark:text-rose-400"></i> Estructura de Pago (50% / 50%)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Card Pago Inicial */}
            <div className={`border rounded-2xl p-5 text-left flex flex-col justify-between
              ${pedido.estado_raw === 'PENDIENTE'
                ? 'bg-rose-50/15 dark:bg-rose-950/5 border-rose-200/50 dark:border-rose-900/30'
                : 'bg-green-50/15 dark:bg-green-950/5 border-green-200/50 dark:border-green-900/30'}`}
            >
              <div>
                <div className="flex justify-between items-center text-sm font-bold text-gray-900 dark:text-white mb-4">
                  <span><i className="bi bi-shield-check mr-1.5 text-rose-600 dark:text-rose-400"></i> Inicial (50%)</span>
                  {pedido.estado_raw === 'PENDIENTE' ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400">Requerido</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/40">Confirmado</span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-gray-955 dark:text-white">${pedido.pago_inicial_usd_estimado.toFixed(2)} <span className="text-[10px] text-gray-400 font-bold uppercase">FOB</span></h2>
                
                {pedido.pago_inicial_ves ? (
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mt-2"><i className="bi bi-cash-stack mr-1"></i> {pedido.pago_inicial_ves.toFixed(2)} Bs</p>
                ) : (
                  <p className="text-sm font-semibold text-gray-400 dark:text-gray-550 mt-2"><i className="bi bi-hourglass-split mr-1"></i> A confirmar por operador</p>
                )}
              </div>
              
              {pedido.tasa_confirmacion && (
                <div className="border-t border-gray-100 dark:border-gray-800/60 mt-4 pt-3 text-[10px] font-bold text-gray-450 uppercase flex justify-between">
                  <span>Tasa congelada:</span>
                  <span className="text-gray-700 dark:text-gray-300">{pedido.tasa_confirmacion.toFixed(2)} Bs/$</span>
                </div>
              )}
            </div>

            {/* Card Saldo Pendiente */}
            <div className={`border rounded-2xl p-5 text-left flex flex-col justify-between
              ${pedido.estado_raw === 'LISTO_RETIRAR'
                ? 'bg-rose-50/15 dark:bg-rose-950/5 border-rose-250 dark:border-rose-800 ring-2 ring-rose-50 dark:ring-rose-905/30'
                : pedido.estado_raw === 'ENTREGADO'
                  ? 'bg-green-50/15 dark:bg-green-950/5 border-green-200/50 dark:border-green-900/30'
                  : 'bg-gray-50/30 dark:bg-gray-950/10 border-gray-200/80 dark:border-gray-800'}`}
            >
              <div>
                <div className="flex justify-between items-center text-sm font-bold text-gray-900 dark:text-white mb-4">
                  <span><i className="bi bi-box-arrow-in-down mr-1.5 text-rose-600 dark:text-rose-400"></i> Entrega (50%)</span>
                  {pedido.estado_raw === 'LISTO_RETIRAR' ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-500 text-white animate-pulse">Disponible</span>
                  ) : pedido.estado_raw === 'ENTREGADO' ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/40">Cancelado</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">En Espera</span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-gray-955 dark:text-white">${pedido.saldo_pendiente_usd_estimado.toFixed(2)}</h2>
                
                {pedido.estado_raw === 'LISTO_RETIRAR' && tasaActual ? (
                  <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-2">
                    <i className="bi bi-lightning-charge mr-1"></i> {(pedido.saldo_pendiente_usd_estimado * parseFloat(tasaActual)).toFixed(2)} Bs
                  </p>
                ) : pedido.estado_raw === 'ENTREGADO' && pedido.saldo_pendiente_ves ? (
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mt-2">
                    <i className="bi bi-cash-stack mr-1"></i> {pedido.saldo_pendiente_ves.toFixed(2)} Bs
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-gray-405 dark:text-gray-550 mt-2">
                    <i className="bi bi-lock mr-1"></i> Se liquida al estar disponible
                  </p>
                )}
              </div>
              
              <div className="border-t border-gray-100 dark:border-gray-800/60 mt-4 pt-3 text-[10px] font-bold text-gray-450 uppercase flex justify-between">
                <span>Tasa de cambio:</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {pedido.estado_raw === 'LISTO_RETIRAR' && tasaActual ? (
                    <span className="text-rose-600 dark:text-rose-400 font-bold">{parseFloat(tasaActual).toFixed(2)} Bs/$ (P2P)</span>
                  ) : pedido.estado_raw === 'ENTREGADO' && pedido.tasa_entrega ? (
                    <span>{pedido.tasa_entrega.toFixed(2)} Bs/$</span>
                  ) : (
                    <span>Diferida</span>
                  )}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Listado de Artículos */}
        <div className="border border-gray-200 dark:border-gray-800 rounded-2xl p-6 mb-8 text-left">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-gray-800/60 pb-3">
            <i className="bi bi-boxes text-rose-600 dark:text-rose-400"></i> Lista de Artículos
          </h3>
          
          {pedido.productos && pedido.productos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-150 dark:border-gray-800 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    <th className="pb-3 w-10">#</th>
                    <th className="pb-3 w-32">Tienda</th>
                    <th className="pb-3">Artículo / Enlace</th>
                    <th className="pb-3 text-right w-24">Precio</th>
                    <th className="pb-3 text-center w-24">Peso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40 font-semibold">
                  {pedido.productos.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-950/20 transition-colors">
                      <td className="py-3.5 text-gray-500 dark:text-gray-400">{idx + 1}</td>
                      <td className="py-3.5">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 uppercase tracking-wider border border-gray-200/50 dark:border-gray-700/50">
                          {item.tienda || 'Web'}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 w-fit text-xs"
                        >
                          <i className="bi bi-link-45deg"></i> Ver Enlace Original
                        </a>
                      </td>
                      <td className="py-3.5 text-right text-gray-900 dark:text-white">${parseFloat(item.precio).toFixed(2)}</td>
                      <td className="py-3.5 text-center text-gray-500 dark:text-gray-400">{item.peso ? `${item.peso} Lbs` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 flex items-center gap-2">
              <i className="bi bi-exclamation-triangle text-amber-500"></i> No se encontraron artículos en este pedido.
            </p>
          )}
        </div>

        {/* Nota del Cliente */}
        {pedido.nota && (
          <div className="border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl p-6 text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Nota del Cliente</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-semibold italic">
              "{pedido.nota}"
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
