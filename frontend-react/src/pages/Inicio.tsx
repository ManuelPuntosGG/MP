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
    <div className="relative overflow-hidden pb-12">
      {/* Resplandor ambiental controlado (solo compositor/opacidad) */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-80 bg-primary-600/8 dark:bg-primary-600/12 blur-3xl rounded-full pointer-events-none"
        aria-hidden="true"
      />

      {/* 1. Hero Section */}
      <section className="relative max-w-5xl mx-auto pt-10 sm:pt-14 pb-8 px-4 sm:px-6 lg:px-8 text-center animate-slide-up">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 shadow-sm mb-6">
          <span className="w-2 h-2 rounded-full bg-primary-600 animate-pulse" aria-hidden="true" />
          <span>Laboratorio Microelectrónico &amp; Tienda de Hardware</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-gray-900 dark:text-white leading-[1.1] text-balance">
          Soluciones <span className="text-primary-600 dark:text-primary-500">Tecnológicas</span> de Alto Nivel
        </h1>

        <p className="mt-5 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed text-pretty">
          Tu aliado en diagnóstico microelectrónico, venta de hardware e importaciones en Venezuela. Transparencia, rigurosidad técnica y respaldo real en cada trabajo.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/rastrear?solicitar=true"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl shadow-md shadow-primary-600/20 transition-[transform,background-color,box-shadow] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-gray-950 text-sm"
          >
            <i className="bi bi-tools" aria-hidden="true"></i>
            Solicitar Reparación
          </Link>
          <Link
            to="/catalogo"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 font-bold rounded-xl shadow-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 text-sm"
          >
            <i className="bi bi-gpu-card text-primary-600 dark:text-primary-400" aria-hidden="true"></i>
            Explorar Catálogo
          </Link>
          <Link
            to="/importaciones"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 font-bold rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 text-sm"
          >
            <i className="bi bi-airplane" aria-hidden="true"></i>
            Cotizar Importación
          </Link>
        </div>
      </section>

      {/* 2. Services Section */}
      <section className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Servicio Técnico */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 sm:p-7 shadow-sm hover:border-primary-300 dark:hover:border-primary-800/70 transition-colors duration-200 flex flex-col justify-between group animate-slide-up delay-75">
            <div>
              <div className="h-12 w-12 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400 text-xl mb-5 transition-transform duration-200 group-hover:scale-105">
                <i className="bi bi-tools" aria-hidden="true"></i>
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2.5">
                Servicio Técnico Especializado
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6 font-medium text-pretty">
                Diagnóstico y reparación a nivel de componente para PCs, laptops, consolas, tarjetas madre y GPUs con bitácora fotográfica en línea.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                to="/rastrear?solicitar=true"
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 text-xs sm:text-sm"
              >
                <i className="bi bi-file-earmark-plus" aria-hidden="true"></i> Ingresar Equipo
              </Link>
              <Link
                to="/rastrear"
                className="inline-flex items-center justify-center gap-1.5 py-3 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200/80 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 text-xs sm:text-sm"
              >
                <i className="bi bi-search" aria-hidden="true"></i> Rastrear
              </Link>
            </div>
          </div>

          {/* Card 2: Tienda Virtual */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 sm:p-7 shadow-sm hover:border-primary-300 dark:hover:border-primary-800/70 transition-colors duration-200 flex flex-col justify-between group animate-slide-up delay-100">
            <div>
              <div className="h-12 w-12 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400 text-xl mb-5 transition-transform duration-200 group-hover:scale-105">
                <i className="bi bi-gpu-card" aria-hidden="true"></i>
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2.5">
                Tienda Virtual de Hardware
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6 font-medium text-pretty">
                Componentes, repuestos, periféricos y equipos nuevos o reacondicionados verificados bajo pruebas de estrés en nuestro laboratorio.
              </p>
            </div>
            <Link
              to="/catalogo"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-900/50 font-bold rounded-xl transition-colors duration-150 hover:bg-primary-600 hover:text-white dark:hover:bg-primary-600 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 text-xs sm:text-sm"
            >
              Explorar Tienda <i className="bi bi-arrow-right" aria-hidden="true"></i>
            </Link>
          </div>

          {/* Card 3: Importaciones */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 sm:p-7 shadow-sm hover:border-primary-300 dark:hover:border-primary-800/70 transition-colors duration-200 flex flex-col justify-between group animate-slide-up delay-150">
            <div>
              <div className="h-12 w-12 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400 text-xl mb-5 transition-transform duration-200 group-hover:scale-105">
                <i className="bi bi-airplane" aria-hidden="true"></i>
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2.5">
                Importaciones a Medida
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6 font-medium text-pretty">
                Traemos tus compras de Amazon, eBay y AliExpress con financiamiento 50% inicial y 50% al retirar en Valencia.
              </p>
            </div>
            <Link
              to="/importaciones"
              className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-900/50 font-bold rounded-xl transition-colors duration-150 hover:bg-primary-600 hover:text-white dark:hover:bg-primary-600 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 text-xs sm:text-sm"
            >
              Calcular Importación <i className="bi bi-arrow-right" aria-hidden="true"></i>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. User Dashboard Section (Only when Logged In) */}
      {user && (
        <section className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 animate-slide-up delay-200">
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                  Mi Actividad Reciente
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">
                  Hola, <span className="font-bold text-primary-600 dark:text-primary-400">{user.nombre_completo || user.email}</span>. Resumen de tus operaciones:
                </p>
              </div>
              <Link
                to="/perfil"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-bold rounded-xl transition-colors duration-150 text-xs self-start sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                Ir a Mi Perfil <i className="bi bi-arrow-right" aria-hidden="true"></i>
              </Link>
            </div>

            {/* Métricas Grid */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800 rounded-2xl text-center">
                <i className="bi bi-tools text-lg text-primary-600 dark:text-primary-400 mb-1 block" aria-hidden="true"></i>
                <span className="text-2xl font-black text-gray-950 dark:text-white block tabular-nums">{totalOrdenes}</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block mt-0.5 truncate">
                  Reparaciones
                </span>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800 rounded-2xl text-center">
                <i className="bi bi-box-seam text-lg text-primary-600 dark:text-primary-400 mb-1 block" aria-hidden="true"></i>
                <span className="text-2xl font-black text-gray-950 dark:text-white block tabular-nums">{totalImportaciones}</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block mt-0.5 truncate">
                  Importaciones
                </span>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800 rounded-2xl text-center">
                <i className="bi bi-cart-check text-lg text-primary-600 dark:text-primary-400 mb-1 block" aria-hidden="true"></i>
                <span className="text-2xl font-black text-gray-950 dark:text-white block tabular-nums">{totalCompras}</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider block mt-0.5 truncate">
                  Compras
                </span>
              </div>
            </div>

            {/* Listado de Actividad Reciente o Empty State */}
            {hasActivity ? (
              <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-6">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                  Movimientos Recientes
                </h3>
                <div className="space-y-2.5">
                  {/* Últimas 3 Reparaciones */}
                  {orders.ordenes?.slice(0, 3).map((o) => (
                    <Link
                      key={o.codigo}
                      to={`/rastrear?codigo=${o.codigo}`}
                      className="flex flex-col sm:flex-row justify-between sm:items-center gap-2.5 p-3.5 bg-gray-50 dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800 rounded-xl hover:border-primary-300 dark:hover:border-primary-800 transition-colors duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-900/50">
                          Servicio
                        </span>
                        <span className="font-mono text-sm font-black text-gray-900 dark:text-white tabular-nums">
                          {o.codigo}
                        </span>
                        {o.equipo && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate max-w-[180px] sm:max-w-xs">
                            · {o.equipo}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wide">
                          {o.estado}
                        </span>
                        <i className="bi bi-arrow-right text-primary-600 dark:text-primary-400 text-sm transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true"></i>
                      </div>
                    </Link>
                  ))}

                  {/* Últimas 3 Importaciones */}
                  {orders.importaciones?.slice(0, 3).map((i) => (
                    <Link
                      key={i.codigo}
                      to={`/importacion/${i.codigo}`}
                      className="flex flex-col sm:flex-row justify-between sm:items-center gap-2.5 p-3.5 bg-gray-50 dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                          Importación
                        </span>
                        <span className="font-mono text-sm font-black text-gray-900 dark:text-white tabular-nums">
                          {i.codigo}
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <span className="text-xs text-gray-700 dark:text-gray-300 font-bold tabular-nums">
                          ${i.total_usd.toFixed(2)}
                        </span>
                        <i className="bi bi-arrow-right text-indigo-600 dark:text-indigo-400 text-sm transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true"></i>
                      </div>
                    </Link>
                  ))}

                  {/* Últimos 3 Pedidos de Catálogo */}
                  {orders.pedidos_catalogo?.slice(0, 3).map((p) => (
                    <Link
                      key={p.codigo}
                      to="/perfil"
                      className="flex flex-col sm:flex-row justify-between sm:items-center gap-2.5 p-3.5 bg-gray-50 dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800 rounded-xl hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                          Compra
                        </span>
                        <span className="font-mono text-sm font-black text-gray-900 dark:text-white tabular-nums">
                          {p.codigo}
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <span className="text-xs text-gray-700 dark:text-gray-300 font-bold tabular-nums">
                          ${p.total.toFixed(2)}
                        </span>
                        <i className="bi bi-arrow-right text-emerald-600 dark:text-emerald-400 text-sm transition-transform duration-150 group-hover:translate-x-1" aria-hidden="true"></i>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-3 text-gray-400 dark:text-gray-500">
                  <i className="bi bi-inbox text-xl" aria-hidden="true"></i>
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">Aún no tienes actividad</h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
                  Tus órdenes de reparación, importaciones y compras del catálogo aparecerán aquí automáticamente.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. Trust / Value Proposition Section */}
      <section className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 animate-slide-up delay-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm text-center">
          <div className="p-2 flex flex-col items-center">
            <div className="w-11 h-11 rounded-2xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-3">
              <i className="bi bi-shield-check text-xl" aria-hidden="true"></i>
            </div>
            <h3 className="text-base font-black text-gray-900 dark:text-white tabular-nums">120 Días de Garantía</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium leading-relaxed max-w-xs">
              Respaldo directo y soporte técnico post-entrega en nuestras reparaciones y productos.
            </p>
          </div>

          <div className="p-2 flex flex-col items-center border-t sm:border-t-0 sm:border-x border-gray-100 dark:border-gray-800 pt-6 sm:pt-2">
            <div className="w-11 h-11 rounded-2xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-3">
              <i className="bi bi-cpu text-xl" aria-hidden="true"></i>
            </div>
            <h3 className="text-base font-black text-gray-900 dark:text-white tabular-nums">+500 Equipos Recuperados</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium leading-relaxed max-w-xs">
              Placas madre, tarjetas gráficas y portátiles de alta gama diagnosticados y reparados con éxito.
            </p>
          </div>

          <div className="p-2 flex flex-col items-center border-t sm:border-t-0 border-gray-100 dark:border-gray-800 pt-6 sm:pt-2">
            <div className="w-11 h-11 rounded-2xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-3">
              <i className="bi bi-camera text-xl" aria-hidden="true"></i>
            </div>
            <h3 className="text-base font-black text-gray-900 dark:text-white">Bitácora en Tiempo Real</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium leading-relaxed max-w-xs">
              Seguimiento paso a paso con evidencia fotográfica de microscopía y presupuesto transparente.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Community Section */}
      <section className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center animate-slide-up delay-300">
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
          Nuestra Comunidad Digital
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium max-w-md mx-auto">
          Mira nuestros casos reales de diagnóstico electrónico y verifica nuestra reputación en plataformas digitales.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-6">
          <a
            href="https://www.tiktok.com/@manuelpuntos"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ir al TikTok de MP Tech"
            className="flex items-center justify-center gap-2.5 p-4 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-sm hover:border-gray-400 dark:hover:border-gray-600 font-bold text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <i className="bi bi-tiktok text-lg text-gray-900 dark:text-white" aria-hidden="true"></i>
            <span>TikTok</span>
          </a>

          <a
            href="https://www.youtube.com/@manuelpuntos/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ir al YouTube de MP Tech"
            className="flex items-center justify-center gap-2.5 p-4 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-sm hover:border-primary-300 dark:hover:border-primary-800 hover:text-primary-600 dark:hover:text-primary-400 font-bold text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <i className="bi bi-youtube text-lg text-primary-600" aria-hidden="true"></i>
            <span>YouTube</span>
          </a>

          <a
            href="https://www.instagram.com/mp_tech_vzla/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ir al Instagram de MP Tech"
            className="flex items-center justify-center gap-2.5 p-4 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-sm hover:border-pink-300 dark:hover:border-pink-800 hover:text-pink-600 dark:hover:text-pink-400 font-bold text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            <i className="bi bi-instagram text-lg text-pink-600" aria-hidden="true"></i>
            <span>Instagram</span>
          </a>

          <a
            href="https://www.facebook.com/marketplace/profile/100080715969057/?ref=permalink&mibextid=dXMIcH"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ir al Marketplace de Facebook de MP Tech"
            className="flex items-center justify-center gap-2.5 p-4 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl shadow-sm hover:border-blue-300 dark:hover:border-blue-800 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <i className="bi bi-shop text-lg text-blue-500" aria-hidden="true"></i>
            <span>Marketplace</span>
          </a>
        </div>
      </section>

      {/* 6. Contact & Location Section */}
      <section className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 animate-slide-up delay-300">
        <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col lg:flex-row gap-8 items-stretch">
          {/* Info Contacto */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-5">
                Contacto y Ubicación
              </h2>
              <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800/70">
                <div className="flex items-start gap-3.5 py-3.5">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="bi bi-geo-alt-fill text-base text-primary-600 dark:text-primary-400" aria-hidden="true"></i>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed text-left">
                    <strong className="text-gray-900 dark:text-white block text-xs uppercase tracking-wider mb-0.5">Dirección</strong>
                    <span>Naguanagua, Tazajal, Residencias Terrazas de Monte Alegre 1, Valencia, Carabobo.</span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 py-3.5">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="bi bi-clock-history text-base text-primary-600 dark:text-primary-400" aria-hidden="true"></i>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 text-left tabular-nums">
                    <strong className="text-gray-900 dark:text-white block text-xs uppercase tracking-wider mb-0.5">Horario de Atención</strong>
                    <span>Lunes a Viernes: 5:00 PM a 10:00 PM · Sábado y Domingo: 9:00 AM a 10:00 PM</span>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 py-3.5">
                  <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="bi bi-whatsapp text-base text-primary-600 dark:text-primary-400" aria-hidden="true"></i>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 text-left tabular-nums">
                    <strong className="text-gray-900 dark:text-white block text-xs uppercase tracking-wider mb-0.5">Atención Directa</strong>
                    <span>+58 424-5022292</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-2 flex flex-col sm:flex-row gap-3">
              <a
                href="https://wa.me/584245022292"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chatear con soporte técnico por WhatsApp"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors duration-150 shadow-sm text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 dark:focus-visible:ring-offset-gray-900"
              >
                <i className="bi bi-whatsapp" aria-hidden="true"></i> Chatear por WhatsApp
              </a>
              <a
                href="https://maps.app.goo.gl/qnHXg1ArB95j4iq4A"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200/80 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-colors duration-150 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <i className="bi bi-map" aria-hidden="true"></i> Abrir en Google Maps
              </a>
            </div>
          </div>

          {/* Mapa de Google */}
          <div className="flex-1 min-h-[280px] sm:min-h-[340px] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 relative bg-gray-100 dark:bg-gray-950">
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
