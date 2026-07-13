import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Login() {
  const { loginUser, registerUser, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/perfil';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const [isRegister, setIsRegister] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | { message?: string } | null>(null);

  if (user) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isRegister) {
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        setLoading(false);
        return;
      }
      const res = await registerUser(email, password, confirmPassword, telefono);
      if (res.success) {
        navigate(from, { replace: true });
      } else {
        setError(res.error || 'Error al registrarse');
      }
    } else {
      const res = await loginUser(email, password);
      if (res.success) {
        navigate(from, { replace: true });
      } else {
        setError(res.error || 'Error al iniciar sesión');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-6 sm:px-6 lg:px-8 bg-gray-50/50 dark:bg-gray-950/20 transition-colors duration-200 animate-fade-in">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-8 shadow-xl shadow-primary-150/10 dark:shadow-black/30 hover:shadow-primary-250/20 dark:hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.2)] hover:border-primary-200 dark:hover:border-primary-900/50 transition-all duration-200 animate-scale-in">
        
        {/* Encabezado */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            {isRegister ? 'Crear una cuenta' : 'Ingresar a MP Tech'}
          </h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {isRegister 
              ? 'Regístrate para ver el estado de tus órdenes y repuestos.' 
              : 'Accede a tu historial de compras e importaciones.'}
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!error}
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-500 focus:bg-white dark:focus:bg-gray-950 transition-all duration-200"
              placeholder="tu@correo.com"
            />
          </div>

          {isRegister && (
            <div>
              <label htmlFor="telefono" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Teléfono (WhatsApp)</label>
              <input
                id="telefono"
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-500 focus:bg-white dark:focus:bg-gray-950 transition-all duration-200"
                placeholder="Ej. +584241234567"
              />
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Contraseña</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!error}
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-500 focus:bg-white dark:focus:bg-gray-950 transition-all duration-200"
              placeholder="Ingresa tu contraseña"
            />
          </div>

          {isRegister && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Confirmar Contraseña</label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-invalid={!!error}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-500 focus:bg-white dark:focus:bg-gray-950 transition-all duration-200"
                placeholder="Repite tu contraseña"
              />
            </div>
          )}

          {error && (
            <div 
              className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium animate-fade-in"
              role="alert"
              aria-live="polite"
            >
              {typeof error === 'string' ? error : (error.message || JSON.stringify(error))}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 shadow-md shadow-primary-600/20 hover:shadow-primary-500/50 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-gray-900 disabled:opacity-50 disabled:hover:-translate-y-0 flex justify-center items-center"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Procesando...
              </span>
            ) : (
              isRegister ? 'Registrarse' : 'Iniciar Sesión'
            )}
          </button>
        </form>

        {/* Toggle Vista */}
        <div className="mt-6 text-center border-t border-gray-100 dark:border-gray-800 pt-6">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-sm font-bold text-primary-600 dark:text-primary-500 hover:text-primary-700 dark:hover:text-primary-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-md px-2 py-1"
          >
            {isRegister 
              ? '¿Ya tienes una cuenta? Inicia sesión' 
              : '¿No tienes cuenta? Regístrate aquí'}
          </button>
        </div>

      </div>
    </div>
  );
}
