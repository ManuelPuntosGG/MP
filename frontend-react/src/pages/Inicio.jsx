import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Inicio() {
  const { user, orders } = useAuth();

  const totalOrdenes = orders.ordenes?.length || 0;
  const totalImportaciones = orders.importaciones?.length || 0;
  const totalCompras = orders.pedidos_catalogo?.length || 0;

  const hasActivity = totalOrdenes > 0 || totalImportaciones > 0 || totalCompras > 0;

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-rose-100 dark:selection:bg-rose-950/30 transition-colors duration-300">
      
      {/* Background glow just for Dark Mode */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[450px] bg-rose-600/10 dark:bg-rose-600/15 blur-[120px] rounded-full pointer-events-none" />

      {/* 1. Hero Section */}
      <section className="relative max-w-5xl mx-auto pt-20 pb-16 px-4 sm:px-6 lg:px-8 text-center animate-slide-up">
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-gray-900 dark:text-white leading-tight">
          Soluciones <span className="text-rose-650 dark:text-rose-500">Tecnológicas</span>
        </h1>
        <p className="mt-6 text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed">
          Expertos en reparación a nivel de componentes electrónicos y venta de hardware de todas las gamas. 
          Transparencia, rigurosidad y confiabilidad en cada uno de nuestros trabajos.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link
            to="/catalogo"
            className="w-full sm:w-auto px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 text-sm"
          >
            <i className="bi bi-cpu text-lg"></i> Catálogo de Hardware
          </Link>
          <Link
            to="/rastrear"
            className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-250 font-bold rounded-2xl hover:bg-rose-50/20 dark:hover:bg-rose-955/20 hover:border-rose-250 dark:hover:border-rose-800 hover:text-rose-655 dark:hover:text-rose-450 transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
          >
            <i className="bi bi-search text-base"></i> Gestionar Mi Reparación
          </Link>
        </div>
      </section>

      {/* 2. Services Section */}
      <section className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card Servicio Técnico */}
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-8 shadow-sm hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.25)] hover:border-rose-150 dark:hover:border-rose-900/50 transition-all duration-300 flex flex-col justify-between animate-slide-up delay-100">
            <div>
              <div className="h-14 w-14 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-450 text-2xl shadow-sm mb-6">
                <i className="bi bi-tools"></i>
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Servicio Técnico Especializado</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6 font-semibold">
                Diagnóstico técnico meticuloso y reparación avanzada de equipos informáticos (PCs de escritorio, notebooks corporativas, consolas, placas madre, GPUs e impresoras).
              </p>
            </div>
            <Link
              to="/rastrear?solicitar=true"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-gray-900 hover:bg-rose-600 dark:bg-gray-850 dark:hover:bg-rose-600 text-white font-bold rounded-xl transition-colors text-sm"
            >
              <i className="bi bi-file-earmark-plus"></i> Solicitar Reparación
            </Link>
          </div>

          {/* Card Tienda */}
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-8 shadow-sm hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.25)] hover:border-rose-150 dark:hover:border-rose-900/50 transition-all duration-300 flex flex-col justify-between animate-slide-up delay-150">
            <div>
              <div className="h-14 w-14 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-450 text-2xl shadow-sm mb-6">
                <i className="bi bi-gpu-card"></i>
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-3">Tienda de Hardware</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-6 font-semibold">
                Disponibilidad constante de componentes informáticos de alto rendimiento, periféricos seleccionados y repuestos originales a precios competitivos del mercado.
              </p>
            </div>
            <Link
              to="/catalogo"
              className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-gray-900 hover:bg-rose-600 dark:bg-gray-850 dark:hover:bg-rose-600 text-white font-bold rounded-xl transition-colors text-sm"
            >
              Explorar Tienda <i className="bi bi-arrow-right"></i>
            </Link>
          </div>

        </div>
      </section>

      {/* 3. User Dashboard Section (Only when Logged In) */}
      {user && (
        <section className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 animate-slide-up delay-200">
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm hover:border-rose-150 dark:hover:border-rose-900/40 hover:shadow-[0_15px_30px_-10px_rgba(225,29,72,0.1)] transition-all duration-300">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">Mi Actividad Reciente</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1.5 font-medium">
              Hola, <span className="font-bold text-rose-600 dark:text-rose-450">{user.nombre_completo || user.email}</span>. Aquí tienes el resumen de tus operaciones activas:
            </p>

            {/* Metricas Grid */}
            <div className="grid grid-cols-3 gap-4 mt-8">
              <div className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl text-center">
                <i className="bi bi-tools text-xl text-rose-600 dark:text-rose-450 mb-1 block"></i>
                <span className="text-2xl font-black text-gray-950 dark:text-white block mt-1">{totalOrdenes}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block mt-0.5">Reparaciones</span>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl text-center">
                <i className="bi bi-box-seam text-xl text-rose-600 dark:text-rose-450 mb-1 block"></i>
                <span className="text-2xl font-black text-gray-950 dark:text-white block mt-1">{totalImportaciones}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block mt-0.5">Importaciones</span>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl text-center">
                <i className="bi bi-cart-check text-xl text-rose-600 dark:text-rose-455 mb-1 block"></i>
                <span className="text-2xl font-black text-gray-950 dark:text-white block mt-1">{totalCompras}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block mt-0.5">Compras</span>
              </div>
            </div>

            {/* Listado de Actividad Reciente */}
            {hasActivity && (
              <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-6">
                <h3 className="text-sm font-bold text-gray-450 dark:text-gray-505 uppercase tracking-wider mb-4">Movimientos Recientes</h3>
                <div className="space-y-3">
                  
                  {/* Ultimas 3 Reparaciones */}
                  {orders.ordenes?.slice(0, 3).map((o) => (
                    <div key={o.codigo} className="flex justify-between items-center p-3.5 bg-gray-50 dark:bg-gray-950 border border-gray-200/50 dark:border-gray-800/80 rounded-xl hover:border-rose-100 dark:hover:border-rose-900/30 transition-colors">
                      <div className="flex items-center space-x-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455 border border-rose-100/50 dark:border-rose-900/40">Reparac.</span>
                        <span className="font-mono text-sm font-black text-gray-900 dark:text-white">{o.codigo}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-gray-550 dark:text-gray-450 font-bold uppercase">{o.estado}</span>
                        <Link to={`/rastrear?codigo=${o.codigo}`} className="text-rose-605 dark:text-rose-400 hover:text-rose-700 font-bold text-sm">
                          <i className="bi bi-arrow-right"></i>
                        </Link>
                      </div>
                    </div>
                  ))}

                  {/* Ultimas 3 Importaciones */}
                  {orders.importaciones?.slice(0, 3).map((i) => (
                    <div key={i.codigo} className="flex justify-between items-center p-3.5 bg-gray-50 dark:bg-gray-950 border border-gray-200/50 dark:border-gray-800/80 rounded-xl hover:border-rose-100 dark:hover:border-rose-900/30 transition-colors">
                      <div className="flex items-center space-x-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/40">Import.</span>
                        <span className="font-mono text-sm font-black text-gray-900 dark:text-white">{i.codigo}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-gray-550 dark:text-gray-455 font-bold">${i.total_usd.toFixed(2)}</span>
                        <Link to={`/importacion/${i.codigo}`} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-bold text-sm">
                          <i className="bi bi-arrow-right"></i>
                        </Link>
                      </div>
                    </div>
                  ))}

                  {/* Ultimos 3 Pedidos de Catálogo */}
                  {orders.pedidos_catalogo?.slice(0, 3).map((p) => (
                    <div key={p.codigo} className="flex justify-between items-center p-3.5 bg-gray-50 dark:bg-gray-950 border border-gray-200/50 dark:border-gray-800/80 rounded-xl hover:border-rose-100 dark:hover:border-rose-900/30 transition-colors">
                      <div className="flex items-center space-x-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/20 text-emerald-650 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/40">Compra</span>
                        <span className="font-mono text-sm font-black text-gray-900 dark:text-white">{p.codigo}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-gray-550 dark:text-gray-450 font-bold">${p.total.toFixed(2)}</span>
                        <Link to="/perfil" className="text-emerald-650 dark:text-emerald-400 hover:text-emerald-700 font-bold text-sm">
                          <i className="bi bi-arrow-right"></i>
                        </Link>
                      </div>
                    </div>
                  ))}

                  {/* Footer links */}
                  <div className="pt-4 text-center">
                    <Link
                      to="/perfil"
                      className="inline-flex items-center gap-1.5 px-6 py-3 border border-gray-200 dark:border-gray-800 hover:border-rose-250 dark:hover:border-rose-600/50 text-gray-700 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-500 font-bold rounded-xl transition-all hover:bg-rose-50/10 dark:hover:bg-rose-950/15 text-xs shadow-sm"
                    >
                      Ver Todos Mis Movimientos <i className="bi bi-arrow-right"></i>
                    </Link>
                  </div>

                </div>
              </div>
            )}

          </div>
        </section>
      )}

      {/* 4. Trust / Value Proposition Section */}
      <section className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 animate-slide-up delay-250">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm text-center">
          
          <div className="p-4 flex flex-col items-center">
            <i className="bi bi-shield-check text-rose-600 dark:text-rose-450 text-3xl mb-3"></i>
            <h4 className="text-base font-black text-gray-900 dark:text-white">Garantía</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold leading-relaxed">
              120 días de respaldo y soporte técnico post-entrega en hardware y servicios.
            </p>
          </div>

          <div className="p-4 flex flex-col items-center border-t sm:border-t-0 sm:border-x border-gray-100 dark:border-gray-800">
            <i className="bi bi-cpu text-rose-600 dark:text-rose-455 text-3xl mb-3"></i>
            <h4 className="text-base font-black text-gray-900 dark:text-white">+500</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold leading-relaxed">
              Equipos electrónicos de alta complejidad reparados y recuperados con éxito.
            </p>
          </div>

          <div className="p-4 flex flex-col items-center border-t sm:border-t-0 border-gray-100 dark:border-gray-800">
            <i className="bi bi-search text-rose-600 dark:text-rose-455 text-3xl mb-3"></i>
            <h4 className="text-base font-black text-gray-900 dark:text-white">Transparencia</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-semibold leading-relaxed">
              Seguimiento de bitácora técnica e informes fotográficos en tiempo real.
            </p>
          </div>

        </div>
      </section>

      {/* 5. Community Section */}
      <section className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-center animate-slide-up delay-300">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white">Nuestra Comunidad Digital</h2>
        <p className="text-sm text-gray-505 dark:text-gray-400 mt-2 font-medium max-w-md mx-auto">
          Conoce nuestros laboratorios de reparación de cerca, aprende con videos técnicos y revisa stock físico al momento.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          
          <a
            href="https://www.tiktok.com/@manuelpuntos"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center p-4 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-sm hover:border-gray-300 dark:hover:border-gray-700 hover:text-black dark:hover:text-white font-bold text-sm transition-all"
          >
            <i className="bi bi-tiktok text-xl mr-2 text-gray-800 dark:text-gray-300"></i> TikTok
          </a>

          <a
            href="https://www.youtube.com/@manuelpuntos/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center p-4 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-sm hover:border-rose-200 dark:hover:border-rose-900/50 hover:text-rose-600 dark:hover:text-rose-500 font-bold text-sm transition-all"
          >
            <i className="bi bi-youtube text-xl mr-2 text-rose-600"></i> YouTube
          </a>

          <a
            href="https://www.instagram.com/mp_tech_vzla/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center p-4 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-sm hover:border-pink-200 dark:hover:border-pink-900/50 hover:text-pink-600 dark:hover:text-pink-400 font-bold text-sm transition-all"
          >
            <i className="bi bi-instagram text-xl mr-2 text-pink-600"></i> Instagram
          </a>

          <a
            href="https://www.facebook.com/marketplace/profile/100080715969057/?ref=permalink&mibextid=dXMIcH"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center p-4 bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl shadow-sm hover:border-blue-200 dark:hover:border-blue-900/50 hover:text-blue-600 dark:hover:text-blue-400 font-bold text-sm transition-all"
          >
            <i className="bi bi-shop text-xl mr-2 text-blue-500"></i> Marketplace
          </a>

        </div>
      </section>

      {/* 6. Contact & Location Section */}
      <section className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 mb-8 animate-slide-up delay-350">
        <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col lg:flex-row gap-8 items-stretch">
          
          {/* Info Contacto */}
          <div className="flex-1 flex flex-col justify-between py-2">
            <div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-6">Contacto y Ubicación</h2>
              <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800/60">
                
                <div className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                    <i className="bi bi-geo-alt-fill text-lg text-rose-600 dark:text-rose-400"></i>
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed text-left">
                    <strong className="text-gray-900 dark:text-white block sm:inline">Dirección:</strong> Naguanagua, Tazajal, Residencias Terrazas de Monte Alegre 1, Valencia, Carabobo.
                  </span>
                </div>

                <div className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                    <i className="bi bi-clock-history text-lg text-rose-600 dark:text-rose-400"></i>
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 text-left">
                    <strong className="text-gray-900 dark:text-white block sm:inline">Lunes a Viernes:</strong> 5:00 PM a 10:00 PM
                  </span>
                </div>

                <div className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                    <i className="bi bi-calendar-week text-lg text-rose-600 dark:text-rose-400"></i>
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 text-left">
                    <strong className="text-gray-900 dark:text-white block sm:inline">Fines de Semana:</strong> Sábado y Domingo de 9:00 AM a 10:00 PM
                  </span>
                </div>

                <div className="flex items-center gap-4 py-4">
                  <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                    <i className="bi bi-phone text-lg text-rose-600 dark:text-rose-400"></i>
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
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 text-sm w-full sm:w-auto"
              >
                <i className="bi bi-whatsapp"></i> Chatear con Soporte Técnico
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
              allowFullScreen=""
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
