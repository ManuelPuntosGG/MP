import { useState, useEffect } from 'react';
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

  if (user) {
    return null;
  }

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
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
        setError(res.error);
      }
    } else {
      const res = await loginUser(email, password);
      if (res.success) {
        navigate(from, { replace: true });
      } else {
        setError(res.error);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gray-50/50 dark:bg-gray-950/20 transition-colors duration-300 animate-fade-in">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-8 shadow-xl shadow-rose-150/10 dark:shadow-black/30 hover:shadow-rose-250/20 dark:hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.2)] hover:border-rose-200 dark:hover:border-rose-900/50 transition-all duration-305 animate-scale-in">
        
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
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Correo Electrónico</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:focus:border-rose-500 focus:bg-white dark:focus:bg-gray-950 outline-none transition-all"
              placeholder="tu@correo.com"
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Teléfono (WhatsApp)</label>
              <input
                type="tel"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:focus:border-rose-500 focus:bg-white dark:focus:bg-gray-950 outline-none transition-all"
                placeholder="Ej. +584241234567"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:focus:border-rose-500 focus:bg-white dark:focus:bg-gray-950 outline-none transition-all"
              placeholder="Ingresa tu contraseña"
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-sm font-bold text-gray-705 dark:text-gray-300 mb-2">Confirmar Contraseña</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:focus:border-rose-500 focus:bg-white dark:focus:bg-gray-950 outline-none transition-all"
                placeholder="Repite tu contraseña"
              />
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-md shadow-rose-600/20 hover:shadow-rose-500/50 hover:scale-[1.01] disabled:opacity-50 flex justify-center items-center"
          >
            {loading ? (
              <span className="animate-pulse">Procesando...</span>
            ) : (
              isRegister ? 'Registrarse' : 'Iniciar Sesión'
            )}
          </button>
        </form>

        {/* Toggle Vista */}
        <div className="mt-6 text-center border-t border-gray-100 dark:border-gray-800 pt-6">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-sm font-bold text-rose-600 dark:text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 transition-colors"
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
