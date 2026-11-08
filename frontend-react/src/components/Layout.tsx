import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logoutUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { totalItems } = useCart();

  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { name: 'Inicio', path: '/', icon: 'bi-house-door' },
    { name: 'Catálogo', path: '/catalogo', icon: 'bi-grid' },
    { name: 'Rastrear Orden', path: '/rastrear', icon: 'bi-tools' },
    { name: 'Importaciones', path: '/importaciones', icon: 'bi-box-seam' },
  ];

  // Actualizar título del documento dinámicamente por ruta (fixing-metadata)
  useEffect(() => {
    const routeTitles: Record<string, string> = {
      '/': 'MP Tech | Soluciones Tecnológicas y Servicio Técnico',
      '/catalogo': 'Tienda Virtual y Catálogo | MP Tech',
      '/rastrear': 'Rastreo y Solicitud de Servicio Técnico | MP Tech',
      '/importaciones': 'Cotizador de Importaciones | MP Tech',
      '/login': 'Iniciar Sesión | MP Tech',
      '/perfil': 'Mi Perfil y Operaciones | MP Tech',
    };

    if (location.pathname.startsWith('/importacion/')) {
      const code = location.pathname.split('/')[2] || '';
      document.title = `Importación ${code.toUpperCase()} | MP Tech`;
    } else {
      document.title = routeTitles[location.pathname] || 'MP Tech | Soluciones Tecnológicas';
    }
  }, [location.pathname]);

  // Cerrar menús al cambiar de ruta
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname, location.search]);

  // Cerrar menús con tecla Escape y clic fuera (fixing-accessibility)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    navigate('/');
  };

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans flex flex-col transition-colors duration-200">
      {/* Enlace de salto para accesibilidad por teclado */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-primary-600 focus:text-white focus:font-bold focus:text-sm focus:shadow-lg focus:outline-none"
      >
        Saltar al contenido principal
      </a>

      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/85 dark:bg-gray-950/85 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800/80 transition-colors duration-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Navegación principal">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link
                to="/"
                className="flex items-center gap-2.5 text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg py-1 px-1"
              >
                <img src="/logo.png" alt="MP Tech Logo" className="h-8 w-8 object-contain" />
                <span>
                  MP <span className="text-primary-600 dark:text-primary-500">Tech</span>
                </span>
              </Link>
            </div>

            {/* Main Nav Links (Desktop) */}
            <div className="hidden md:flex items-center gap-1 bg-gray-100/80 dark:bg-gray-900/90 p-1 rounded-full border border-gray-200/70 dark:border-gray-800">
              {navLinks.map((link) => {
                const isActive =
                  link.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    aria-current={isActive ? 'page' : undefined}
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                      isActive
                        ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <i className={`bi ${link.icon} text-xs`} aria-hidden="true"></i>
                    {link.name}
                  </Link>
                );
              })}
            </div>

            {/* Right Controls: Cart, Theme Toggle, Auth & Mobile Menu */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Acceso Rápido al Carrito */}
              <Link
                to="/catalogo?tab=carrito"
                aria-label={totalItems > 0 ? `Ver carrito de compras (${totalItems} artículos)` : 'Ver carrito de compras'}
                className="relative p-2.5 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                title="Carrito de compras"
              >
                <i className="bi bi-cart3 text-lg leading-none" aria-hidden="true"></i>
                {totalItems > 0 && (
                  <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary-600 text-white text-[10px] font-black tabular-nums flex items-center justify-center ring-2 ring-white dark:ring-gray-950">
                    {totalItems}
                  </span>
                )}
              </Link>

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                className="p-2.5 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors duration-150 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                )}
              </button>

              {/* Login Button or Profile Dropdown (Desktop) */}
              {user ? (
                <div className="relative hidden md:block" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    aria-expanded={userDropdownOpen}
                    aria-haspopup="menu"
                    className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-full py-1 pl-1 pr-2.5 border border-gray-200/80 dark:border-gray-800 transition-colors duration-150"
                  >
                    <span className="h-7 w-7 rounded-full bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 flex items-center justify-center text-primary-600 dark:text-primary-400 font-black text-xs">
                      {user.email[0].toUpperCase()}
                    </span>
                    <span className="max-w-[120px] truncate hidden lg:block">
                      {user.nombre_completo || user.email.split('@')[0]}
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {userDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl p-1.5 z-50 animate-scale-in origin-top-right"
                      role="menu"
                    >
                      <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 mb-1">
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {user.nombre_completo || 'Cliente MP Tech'}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                          {user.email}
                        </p>
                      </div>
                      <Link
                        to="/perfil"
                        onClick={() => setUserDropdownOpen(false)}
                        role="menuitem"
                        className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors focus-visible:outline-none focus-visible:bg-gray-100 dark:focus-visible:bg-gray-800"
                      >
                        <i className="bi bi-person-circle text-sm text-gray-400" aria-hidden="true"></i>
                        Mi Perfil y Órdenes
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        role="menuitem"
                        className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 text-xs font-bold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-xl transition-colors focus-visible:outline-none focus-visible:bg-primary-50 dark:focus-visible:bg-primary-950/40 mt-0.5"
                      >
                        <i className="bi bi-box-arrow-right text-sm" aria-hidden="true"></i>
                        Cerrar Sesión
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="hidden md:inline-flex items-center gap-1.5 justify-center px-4 py-2 rounded-full text-xs font-bold text-white bg-gray-900 hover:bg-primary-600 dark:bg-white dark:text-gray-950 dark:hover:bg-primary-500 dark:hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-gray-950"
                >
                  <i className="bi bi-person text-sm" aria-hidden="true"></i>
                  Ingresar
                </Link>
              )}

              {/* Mobile menu button */}
              <button
                type="button"
                className="md:hidden p-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-xl"
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? 'Cerrar menú principal' : 'Abrir menú principal'}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <svg className="block h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="block h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-xl animate-slide-down origin-top">
            <div className="p-3 space-y-1">
              {navLinks.map((link) => {
                const isActive =
                  link.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(link.path);
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900'
                    }`}
                  >
                    <i className={`bi ${link.icon} text-base`} aria-hidden="true"></i>
                    {link.name}
                  </Link>
                );
              })}

              <div className="pt-3 mt-2 border-t border-gray-100 dark:border-gray-800/80">
                {user ? (
                  <div className="space-y-1">
                    <Link
                      to="/perfil"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3.5 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      <i className="bi bi-person-circle text-base text-primary-600 dark:text-primary-400" aria-hidden="true"></i>
                      <span className="truncate">Mi Perfil ({user.nombre_completo || user.email})</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full text-left px-3.5 py-2.5 text-sm font-bold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      <i className="bi bi-box-arrow-right text-base" aria-hidden="true"></i>
                      Cerrar Sesión
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gray-900 hover:bg-primary-600 dark:bg-white dark:text-gray-950 dark:hover:bg-primary-500 dark:hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  >
                    <i className="bi bi-person text-base" aria-hidden="true"></i>
                    Ingresar a mi cuenta
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main id="main-content" className="flex-1 pt-16 relative w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900/90 border-t border-gray-200/80 dark:border-gray-800/80 transition-colors duration-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {/* Columna 1: Marca */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3">
              <Link to="/" className="flex items-center gap-2 text-lg font-black tracking-tight text-gray-900 dark:text-white">
                <img src="/logo.png" alt="MP Tech Logo" className="h-6 w-6 object-contain" />
                <span>
                  MP <span className="text-primary-600 dark:text-primary-500">Tech</span>
                </span>
              </Link>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium max-w-xs leading-relaxed">
                Especialistas en microelectrónica, reparación avanzada y venta de hardware en Venezuela.
              </p>
              <div className="flex items-center gap-2.5 pt-1">
                <a
                  href="https://www.tiktok.com/@manuelpuntos"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Síguenos en TikTok"
                  className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 flex items-center justify-center border border-gray-200/60 dark:border-gray-700/60 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <i className="bi bi-tiktok text-base" aria-hidden="true"></i>
                </a>
                <a
                  href="https://www.youtube.com/@manuelpuntos/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Síguenos en YouTube"
                  className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 flex items-center justify-center border border-gray-200/60 dark:border-gray-700/60 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <i className="bi bi-youtube text-base" aria-hidden="true"></i>
                </a>
                <a
                  href="https://www.instagram.com/mp_tech_vzla/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Síguenos en Instagram"
                  className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-950/40 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 flex items-center justify-center border border-gray-200/60 dark:border-gray-700/60 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <i className="bi bi-instagram text-base" aria-hidden="true"></i>
                </a>
              </div>
            </div>

            {/* Columna 2: Accesos Rápidos */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3">
              <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                Servicios y Tienda
              </h4>
              <ul className="space-y-2 text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                <li>
                  <Link to="/catalogo" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    Catálogo de Hardware
                  </Link>
                </li>
                <li>
                  <Link to="/rastrear" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    Rastrear Orden de Servicio
                  </Link>
                </li>
                <li>
                  <Link to="/rastrear?solicitar=true" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    Solicitar Reparación en Línea
                  </Link>
                </li>
                <li>
                  <Link to="/importaciones" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                    Cotizador de Importaciones
                  </Link>
                </li>
              </ul>
            </div>

            {/* Columna 3: Contacto */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3">
              <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                Contacto y Horario
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
                <li className="flex items-center justify-center md:justify-start gap-2.5">
                  <i className="bi bi-geo-alt text-primary-600 dark:text-primary-400 text-sm flex-shrink-0" aria-hidden="true"></i>
                  <span>Naguanagua, Tazajal — Valencia</span>
                </li>
                <li className="flex items-center justify-center md:justify-start gap-2.5 tabular-nums">
                  <i className="bi bi-clock text-primary-600 dark:text-primary-400 text-sm flex-shrink-0" aria-hidden="true"></i>
                  <span>L-V 5PM–10PM · Sáb-Dom 9AM–10PM</span>
                </li>
                <li className="flex items-center justify-center md:justify-start gap-2.5 tabular-nums">
                  <i className="bi bi-whatsapp text-primary-600 dark:text-primary-400 text-sm flex-shrink-0" aria-hidden="true"></i>
                  <a
                    href="https://wa.me/584245022292"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    +58 424-5022292
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Línea Divisoria */}
          <div className="border-t border-gray-200/70 dark:border-gray-800 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs font-semibold text-gray-400 dark:text-gray-500 tabular-nums">
            <p>&copy; {new Date().getFullYear()} MP Tech. Todos los derechos reservados.</p>
            <p className="flex items-center gap-1.5">
              Desarrollado por <span className="text-gray-600 dark:text-gray-300 font-bold">ManuelPuntos</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
