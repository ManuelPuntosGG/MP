import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Inicio() {
  const { user, orders } = useAuth();

  const totalOrdenes = orders.ordenes?.length || 0;
  const totalImportaciones = orders.importaciones?.length || 0;
  const totalCompras = orders.pedidos_catalogo?.length || 0;

  const hasActivity = totalOrdenes > 0 || totalImportaciones > 0 || totalCompras > 0;

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-primary-200 dark:selection:bg-primary-950/30 transition-colors duration-200">
      
      {/* Background glow just for Dark Mode */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[450px] bg-primary-600/10 dark:bg-primary-600/15 blur-[120px] rounded-full pointer-events-none" aria-hidden="true" />

      {/* 1. Hero Section */}
      <section className="relative max-w-5xl mx-auto pt-8 pb-6 px-4 sm:px-6 lg:px-8 text-center animate-slide-up">
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-gray-900 dark:text-white leading-tight">
          Soluciones <span className="text-primary-600 dark:text-primary-500">Tecnológicas</span>
        </h1>
        <p className="mt-6 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed">
          Tu aliado en ventas y servicios de técnología al alcance de todos. <br className="hidden sm:inline" />
          Transparencia, rigurosidad y confiabilidad en cada uno de nuestros trabajos.
        </p>
      </section>

      {/* 2. Services Section */}
      <section className="max-w-7xl mx-auto pt-2 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card Servicio Técnico */}
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-8 shadow-sm hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.25)] hover:border-primary-200 dark:hover:border-primary-900/50 transition-all duration-200 flex flex-col justify-between group animate-slide-up delay-100">
            <div>
              <div className="h-14 w-14 rounded-2xl bg-primary-50 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400 text-2xl shadow-sm mb-6 group-hover:scale-110 transition-transform duration-200">
                <i className="bi bi-tools" aria-hidden="true"></i>
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Servicio Técnico Especializado</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6 font-semibold">
                Diagnóstico y reparación avanzada de equipos informáticos de todas las gamas (PCs de escritorio, laptops, consolas, placas madre, GPUs, impresoras, entre otros).
              </p>
            </div>
            <Link
              to="/rastrear?solicitar=true"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 font-bold rounded-xl transition-all duration-200 hover:bg-primary-600 hover:text-white dark:hover:bg-primary-600 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 text-sm"
            >
              <i className="bi bi-file-earmark-plus" aria-hidden="true"></i> Solicitar Reparación
            </Link>
          </div>

          {/* Card Tienda */}
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-8 shadow-sm hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.25)] hover:border-primary-200 dark:hover:border-primary-900/50 transition-all duration-200 flex flex-col justify-between group animate-slide-up delay-150">
            <div>
              <div className="h-14 w-14 rounded-2xl bg-primary-50 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400 text-2xl shadow-sm mb-6 group-hover:scale-110 transition-transform duration-200">
                <i className="bi bi-gpu-card" aria-hidden="true"></i>
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Tienda Virtual</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6 font-semibold">
                Equipos, componentes y accesorios tecnológicos de calidad de todas las gamas al mejor precio del mercado.
              </p>
            </div>
            <Link
              to="/catalogo"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 font-bold rounded-xl transition-all duration-200 hover:bg-primary-600 hover:text-white dark:hover:bg-primary-600 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 text-sm"
            >
              Explorar Tienda <i className="bi bi-arrow-right" aria-hidden="true"></i>
            </Link>
          </div>

        </div>
      </section>

      {/* 3. User Dashboard Section (Only when Logged In) */}
      {user && (
        <section className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 animate-slide-up delay-200">
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm hover:border-primary-200 dark:hover:border-primary-900/40 hover:shadow-lg transition-all duration-200">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">Mi Actividad Reciente</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1.5 font-medium">
              Hola, <span className="font-bold text-primary-600 dark:text-primary-400">{user.nombre_completo || user.email}</span>. Aquí tienes el resumen de tus operaciones activas:
            </p>
            
            {/* Metricas Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              <div className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl text-center transition-colors duration-200 hover:bg-primary-50/50 dark:hover:bg-primary-900/10">
                <i className="bi bi-tools text-xl text-primary-600 dark:text-primary-400 mb-1 block" aria-hidden="true"></i>
                <span className="text-2xl font-black text-gray-950 dark:text-white block mt-1">{totalOrdenes}</span>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mt-0.5">Reparaciones</span>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl text-center transition-colors duration-200 hover:bg-primary-50/50 dark:hover:bg-primary-900/10">
                <i className="bi bi-box-seam text-xl text-primary-600 dark:text-primary-400 mb-1 block" aria-hidden="true"></i>
                <span className="text-2xl font-black text-gray-950 dark:text-white block mt-1">{totalImportaciones}</span>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mt-0.5">Importaciones</span>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl text-center transition-colors duration-200 hover:bg-primary-50/50 dark:hover:bg-primary-900/10">
                <i className="bi bi-cart-check text-xl text-primary-600 dark:text-primary-400 mb-1 block" aria-hidden="true"></i>
                <span className="text-2xl font-black text-gray-950 dark:text-white block mt-1">{totalCompras}</span>
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block mt-0.5">Compras</span>
              </div>
            </div>

            {/* Listado de Actividad Reciente o Empty State */}
            {hasActivity ? (
              <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-6">
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Movimientos Recientes</h3>
                <div className="space-y-3">
                  
                  {/* Ultimas 3 Reparaciones */}
                  {orders.ordenes?.slice(0, 3).map((o) => (
                    <div key={o.codigo} className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-950 border border-gray-200/50 dark:border-gray-800/80 rounded-xl hover:border-primary-200 dark:hover:border-primary-900/40 transition-colors duration-200 group">
                      <div className="flex items-center space-x-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 border border-primary-100/50 dark:border-primary-900/40">Reparac.</span>
                        <span className="font-mono text-sm font-black text-gray-900 dark:text-white">{o.codigo}</span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end space-x-3 border-t border-gray-100 dark:border-gray-800/40 pt-2 sm:pt-0 sm:border-0">
                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wide text-right break-words max-w-[220px] sm:max-w-xs">{o.estado}</span>
                        <Link to={`/rastrear?codigo=${o.codigo}`} className="text-primary-600 dark:text-primary-400 hover:text-primary-700 font-bold text-sm p-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 group-hover:translate-x-1 transition-transform duration-200" aria-label={`Ver detalles de reparación ${o.codigo}`}>
                          <i className="bi bi-arrow-right" aria-hidden="true"></i>
                        </Link>
                      </div>
                    </div>
                  ))}

                  {/* Ultimas 3 Importaciones */}
                  {orders.importaciones?.slice(0, 3).map((i) => (
                    <div key={i.codigo} className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-950 border border-gray-200/50 dark:border-gray-800/80 rounded-xl hover:border-indigo-200 dark:hover:border-indigo-900/40 transition-colors duration-200 group">
                      <div className="flex items-center space-x-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/40">Import.</span>
                        <span className="font-mono text-sm font-black text-gray-900 dark:text-white">{i.codigo}</span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end space-x-3 border-t border-gray-100 dark:border-gray-800/40 pt-2 sm:pt-0 sm:border-0">
                        <span className="text-xs text-gray-500 font-bold">${i.total_usd.toFixed(2)}</span>
                        <Link to={`/importacion/${i.codigo}`} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-bold text-sm p-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 group-hover:translate-x-1 transition-transform duration-200" aria-label={`Ver detalles de importación ${i.codigo}`}>
                          <i className="bi bi-arrow-right" aria-hidden="true"></i>
                        </Link>
                      </div>
                    </div>
                  ))}

                  {/* Ultimos 3 Pedidos de Catálogo */}
                  {orders.pedidos_catalogo?.slice(0, 3).map((p) => (
                    <div key={p.codigo} className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-950 border border-gray-200/50 dark:border-gray-800/80 rounded-xl hover:border-emerald-200 dark:hover:border-emerald-900/40 transition-colors duration-200 group">
                      <div className="flex items-center space-x-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/40">Compra</span>
                        <span className="font-mono text-sm font-black text-gray-900 dark:text-white">{p.codigo}</span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end space-x-3 border-t border-gray-100 dark:border-gray-800/40 pt-2 sm:pt-0 sm:border-0">
                        <span className="text-xs text-gray-500 font-bold">${p.total.toFixed(2)}</span>
                        <Link to="/perfil" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-bold text-sm p-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 group-hover:translate-x-1 transition-transform duration-200" aria-label={`Ver compra ${p.codigo} en perfil`}>
                          <i className="bi bi-arrow-right" aria-hidden="true"></i>
                        </Link>
                      </div>
                    </div>
                  ))}

                  {/* Footer links */}
                  <div className="pt-4 text-center">
                    <Link
                      to="/perfil"
                      className="inline-flex items-center gap-1.5 px-6 py-3 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600/50 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-500 font-bold rounded-xl transition-all duration-200 hover:bg-primary-50/50 dark:hover:bg-primary-950/20 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      Ver Todos Mis Movimientos <i className="bi bi-arrow-right" aria-hidden="true"></i>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mb-4 text-gray-400 dark:text-gray-600">
                  <i className="bi bi-inbox text-3xl" aria-hidden="true"></i>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Aún no tienes actividad</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                  No hemos registrado reparaciones, importaciones ni compras. ¡Explora nuestro catálogo para empezar!
                </p>
                <Link
                  to="/catalogo"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl hover:bg-primary-600 dark:hover:bg-primary-500 hover:text-white transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-gray-950 text-sm"
                >
                  Ir al Catálogo <i className="bi bi-arrow-right" aria-hidden="true"></i>
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. Trust / Value Proposition Section */}
      <section className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 animate-slide-up delay-250">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm text-center">
          
          <div className="p-4 flex flex-col items-center">
            <i className="bi bi-shield-check text-primary-600 dark:text-primary-400 text-3xl mb-3" aria-hidden="true"></i>
            <h4 className="text-base font-black text-gray-900 dark:text-white">Garantía</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold leading-relaxed">
              120 días de respaldo y soporte técnico post-entrega en hardware y servicios.
            </p>
          </div>

          <div className="p-4 flex flex-col items-center border-t sm:border-t-0 sm:border-x border-gray-100 dark:border-gray-800">
            <i className="bi bi-cpu text-primary-600 dark:text-primary-400 text-3xl mb-3" aria-hidden="true"></i>
            <h4 className="text-base font-black text-gray-900 dark:text-white">+500</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold leading-relaxed">
              Equipos electrónicos de alta complejidad reparados y recuperados con éxito.
            </p>
          </div>

          <div className="p-4 flex flex-col items-center border-t sm:border-t-0 border-gray-100 dark:border-gray-800">
            <i className="bi bi-search text-primary-600 dark:text-primary-400 text-3xl mb-3" aria-hidden="true"></i>
            <h4 className="text-base font-black text-gray-900 dark:text-white">Transparencia</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold leading-relaxed">
              Seguimiento de bitácora técnica e informes fotográficos en tiempo real.
            </p>
          </div>

        </div>
      </section>

      {/* 5. Community Section */}
      <section className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center animate-slide-up delay-300">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white">Nuestra Comunidad Digital</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium max-w-md mx-auto">
          Conoce nuestros trabajos de reparación de cerca, aprende con videos técnicos y revisa nuestra reputación en plataformas digitales.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          
          <a
            href="https://www.tiktok.com/@manuelpuntos"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ir al TikTok de MP Tech"
            className="flex items-center justify-center p-4 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-sm hover:border-gray-300 dark:hover:border-gray-700 hover:text-black dark:hover:text-white font-bold text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            <i className="bi bi-tiktok text-xl mr-2 text-gray-800 dark:text-gray-300" aria-hidden="true"></i> TikTok
          </a>

          <a
            href="https://www.youtube.com/@manuelpuntos/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ir al YouTube de MP Tech"
            className="flex items-center justify-center p-4 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-sm hover:border-primary-200 dark:hover:border-primary-900/50 hover:text-primary-600 dark:hover:text-primary-500 font-bold text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <i className="bi bi-youtube text-xl mr-2 text-primary-600" aria-hidden="true"></i> YouTube
          </a>

          <a
            href="https://www.instagram.com/mp_tech_vzla/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ir al Instagram de MP Tech"
            className="flex items-center justify-center p-4 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-sm hover:border-pink-200 dark:hover:border-pink-900/50 hover:text-pink-600 dark:hover:text-pink-400 font-bold text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            <i className="bi bi-instagram text-xl mr-2 text-pink-600" aria-hidden="true"></i> Instagram
          </a>

          <a
            href="https://www.facebook.com/marketplace/profile/100080715969057/?ref=permalink&mibextid=dXMIcH"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ir al Marketplace de Facebook de MP Tech"
            className="flex items-center justify-center p-4 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-sm hover:border-blue-200 dark:hover:border-blue-900/50 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <i className="bi bi-shop text-xl mr-2 text-blue-500" aria-hidden="true"></i> Marketplace
          </a>

        </div>
      </section>

      {/* 6. Contact & Location Section */}
      <section className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 mb-8 animate-slide-up delay-350">
        <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col lg:flex-row gap-8 items-stretch">
          
          {/* Info Contacto */}
          <div className="flex-1 flex flex-col justify-between py-2">
            <div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-6">Contacto y Ubicación</h2>
              <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800/60">
                
                <div className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                    <i className="bi bi-geo-alt-fill text-lg text-primary-600 dark:text-primary-400" aria-hidden="true"></i>
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed text-left">
                    <strong className="text-gray-900 dark:text-white block sm:inline">Dirección:</strong> Naguanagua, Tazajal, Residencias Terrazas de Monte Alegre 1, Valencia, Carabobo.
                  </span>
                </div>

                <div className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                    <i className="bi bi-clock-history text-lg text-primary-600 dark:text-primary-400" aria-hidden="true"></i>
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 text-left">
                    <strong className="text-gray-900 dark:text-white block sm:inline">Lunes a Viernes:</strong> 5:00 PM a 10:00 PM
                  </span>
                </div>

                <div className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                    <i className="bi bi-calendar-week text-lg text-primary-600 dark:text-primary-400" aria-hidden="true"></i>
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 text-left">
                    <strong className="text-gray-900 dark:text-white block sm:inline">Fines de Semana:</strong> Sábado y Domingo de 9:00 AM a 10:00 PM
                  </span>
                </div>

                <div className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                    <i className="bi bi-phone text-lg text-primary-600 dark:text-primary-400" aria-hidden="true"></i>
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 text-left">
                    <strong className="text-gray-900 dark:text-white block sm:inline">Soporte Directo (WhatsApp):</strong> +58 424-5022292
                  </span>
                </div>

              </div>
            </div>

            <div className="mt-4 pt-4">
              <a
                href="https://wa.me/584245022292"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chatear con soporte técnico por WhatsApp"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all duration-200 shadow-md shadow-emerald-600/20 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 dark:focus-visible:ring-offset-gray-900 text-sm w-full sm:w-auto"
              >
                <i className="bi bi-whatsapp" aria-hidden="true"></i> Chatear con Soporte Técnico
              </a>
            </div>
          </div>

          {/* Mapa de Google */}
          <div className="flex-1 min-h-[300px] sm:min-h-[380px] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-inner relative">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3926.093263064714!2d-67.9988419!3d10.2540618!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e805de9950f9af7%3A0x29ff89c68666a5bc!2sMP%20Tech!5e0!3m2!1ses!2sve!4v1779739157376!5m2!1ses!2sve"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicación de MP Tech en Google Maps"
              className="absolute inset-0 w-full h-full"
            />
          </div>

        </div>
      </section>

    </div>
  );
}
