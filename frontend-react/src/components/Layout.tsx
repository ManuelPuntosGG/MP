import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logoutUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState<boolean>(false);

  const navLinks = [
    { name: 'Inicio', path: '/' },
    { name: 'Catálogo', path: '/catalogo' },
    { name: 'Importaciones', path: '/importaciones' },
    { name: 'Rastrear Orden', path: '/rastrear' },
  ];

  const handleLogout = async () => {
    await logoutUser();
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-rose-500/30 flex flex-col transition-colors duration-200">
      {/* Navbar Minimalista */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 dark:bg-gray-950/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800/60 shadow-sm transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-2xl font-black tracking-tighter text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-md">
                MP <span className="text-primary-600">Tech</span>
              </Link>
            </div>

            {/* Main Nav Links (Desktop) */}
            <div className="hidden md:flex flex-1 justify-center space-x-8">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    aria-current={isActive ? 'page' : undefined}
                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors duration-200 border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-sm ${
                      isActive 
                        ? 'border-primary-600 text-primary-600' 
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>

            {/* Right side: Theme Toggle, Auth & Mobile Menu Toggle */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-500 transition-colors rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                )}
              </button>
              
              {/* Login Button or Profile Dropdown (Desktop) */}
              {user ? (
                <div className="relative hidden md:block">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    aria-expanded={userDropdownOpen}
                    aria-haspopup="menu"
                    className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-full p-1"
                  >
                    <span className="h-8 w-8 rounded-full bg-primary-50 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-sm transition-colors duration-200">
                      {user.email[0].toUpperCase()}
                    </span>
                    <span className="max-w-[120px] truncate hidden lg:block">{user.nombre_completo || user.email}</span>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {userDropdownOpen && (
                    <div 
                      className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xl py-1 z-50 transform opacity-100 scale-100 transition-all duration-200"
                      role="menu"
                    >
                      <Link
                        to="/perfil"
                        onClick={() => setUserDropdownOpen(false)}
                        role="menuitem"
                        className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium focus-visible:outline-none focus-visible:bg-gray-50 dark:focus-visible:bg-gray-800"
                      >
                        Mi Perfil
                      </Link>
                      <button
                        onClick={handleLogout}
                        role="menuitem"
                        className="block w-full text-left px-4 py-3 text-sm text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/30 font-bold border-t border-gray-50 dark:border-gray-800 focus-visible:outline-none focus-visible:bg-primary-50 dark:focus-visible:bg-primary-950/30 transition-colors"
                      >
                        Cerrar Sesión
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link 
                  to="/login" 
                  className="hidden md:inline-flex items-center justify-center px-5 py-2 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-primary-600 dark:bg-gray-800 dark:hover:bg-primary-700 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-gray-950"
                >
                  Ingresar
                </Link>
              )}

              {/* Mobile menu button */}
              <button
                type="button"
                className="md:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md"
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span className="sr-only">Abrir menú principal</span>
                {mobileMenuOpen ? (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-md animate-slide-down origin-top">
            <div className="pt-2 pb-3 space-y-1 px-4">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                      isActive
                        ? 'border-primary-600 text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/20'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
              
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                {user ? (
                  <div className="space-y-1">
                    <Link
                      to="/perfil"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block pl-3 pr-4 py-2 text-base font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md"
                    >
                      Mi Perfil ({user.nombre_completo || user.email})
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left pl-3 pr-4 py-2 text-base font-bold text-primary-600 dark:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                ) : (
                  <Link 
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-gray-900 hover:bg-primary-600 dark:bg-gray-800 dark:hover:bg-primary-700 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  >
                    Ingresar
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 mt-16 relative w-full bg-gray-50/50 dark:bg-gray-950/40 transition-colors duration-200">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
            {/* Columna 1: MP Tech Info */}
            <div className="flex flex-col items-center text-center space-y-4">
              <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">MP Tech</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium max-w-md leading-relaxed mx-auto">
                Especialistas en reparación y venta de hardware. Diagnóstico de componentes electrónicos.
              </p>
              <div className="flex items-center justify-center space-x-4 pt-2">
                <a 
                  href="https://www.tiktok.com/@manuelpuntos" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  aria-label="Síguenos en TikTok"
                  className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-950/30 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 flex items-center justify-center border border-gray-100 dark:border-gray-800 hover:border-primary-100 dark:hover:border-primary-900/50 transition-all duration-200 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <i className="bi bi-tiktok text-lg"></i>
                </a>
                <a 
                  href="https://www.youtube.com/@manuelpuntos/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  aria-label="Síguenos en YouTube"
                  className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-950/30 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 flex items-center justify-center border border-gray-100 dark:border-gray-800 hover:border-primary-100 dark:hover:border-primary-900/50 transition-all duration-200 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <i className="bi bi-youtube text-lg"></i>
                </a>
                <a 
                  href="https://www.instagram.com/mp_tech_vzla/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  aria-label="Síguenos en Instagram"
                  className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-950/30 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 flex items-center justify-center border border-gray-100 dark:border-gray-800 hover:border-primary-100 dark:hover:border-primary-900/50 transition-all duration-200 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <i className="bi bi-instagram text-lg"></i>
                </a>
              </div>
            </div>

            {/* Columna 2: Contacto */}
            <div className="flex flex-col items-center text-center space-y-4">
              <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-wider">Contacto</h4>
              <ul className="space-y-3 flex flex-col items-center">
                <li className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
                  <i className="bi bi-geo-alt text-primary-600 dark:text-primary-400 text-lg flex-shrink-0" aria-hidden="true"></i>
                  <span>Naguanagua, Valencia</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
                  <i className="bi bi-clock text-primary-600 dark:text-primary-400 text-lg flex-shrink-0" aria-hidden="true"></i>
                  <span>Lun-Vie 5PM-10PM / Sáb-Dom 9AM-10PM</span>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 font-medium">
                  <i className="bi bi-phone text-primary-600 dark:text-primary-400 text-lg flex-shrink-0" aria-hidden="true"></i>
                  <span>+58 424-5022292</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Línea Divisoria */}
          <div className="border-t border-gray-100 dark:border-gray-800 mt-10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">
            <p>&copy; {new Date().getFullYear()} MP Tech. Todos los derechos reservados.</p>
            <p className="flex items-center gap-1">
              Desarrollado con <i className="bi bi-heart-fill text-primary-600 dark:text-primary-500 animate-pulse" aria-label="Amor"></i> por ManuelPuntos
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
