import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function Layout() {
  const location = useLocation();
  const { totalItems } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Catálogo', path: '/' },
    { name: 'Importaciones', path: '/importaciones' },
    { name: 'Rastrear Orden', path: '/rastrear' },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-rose-500/30 flex flex-col">
      {/* Navbar Minimalista */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-2xl font-black tracking-tighter text-gray-900">
                MP <span className="text-rose-600">Tech</span>
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
                    className={`inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors duration-200 border-b-2 ${
                      isActive 
                        ? 'border-rose-600 text-rose-600' 
                        : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>

            {/* Right side: Cart, Auth & Mobile Menu Toggle */}
            <div className="flex items-center space-x-4">
              {/* Cart Icon */}
              <Link to="/carrito" className="relative p-2 text-gray-600 hover:text-rose-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
                {/* Badge */}
                {totalItems > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-rose-600 rounded-full animate-bounce">
                    {totalItems}
                  </span>
                )}
              </Link>
              
              {/* Login Button (Desktop) */}
              <Link to="/login" className="hidden md:inline-flex items-center justify-center px-5 py-2 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-rose-600 transition-colors">
                Ingresar
              </Link>

              {/* Mobile menu button */}
              <button
                type="button"
                className="md:hidden p-2 text-gray-500 hover:text-gray-900 transition-colors"
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
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="pt-2 pb-3 space-y-1 px-4">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.name}
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                      isActive
                        ? 'border-rose-600 text-rose-700 bg-rose-50'
                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <Link 
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-gray-900 hover:bg-rose-600"
                >
                  Ingresar
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 mt-16 relative w-full bg-gray-50/50">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} MP Tech. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
