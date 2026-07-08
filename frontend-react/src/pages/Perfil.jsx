import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, Navigate } from 'react-router-dom';
import api from '../api/axios';

export default function Perfil() {
  const { user, orders, loading, refreshUser } = useAuth();
  
  const [editing, setEditing] = useState(false);
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [editError, setEditError] = useState(null);
  const [editSuccess, setEditSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-gray-50/50 dark:bg-gray-950/20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const startEditing = () => {
    setNombreCompleto(user.nombre_completo || '');
    setTelefono(user.telefono || '');
    setEditing(true);
    setEditSuccess(false);
    setEditError(null);
  };

  const handleEditProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setEditError(null);
    setEditSuccess(false);

    try {
      const response = await api.post('/editar-perfil/', {
        email: user.email,
        nombre_completo: nombreCompleto,
        telefono: telefono
      });

      if (response.data.success) {
        setEditSuccess(true);
        setEditing(false);
        await refreshUser();
      }
    } catch (err) {
      setEditError(err.response?.data?.error || 'Error al actualizar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 bg-gray-50/50 dark:bg-gray-950/20 transition-colors duration-300 animate-fade-in">
      
      {/* Header Perfil */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.25)] hover:border-rose-150 dark:hover:border-rose-900/50 transition-all duration-300 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 animate-slide-up">
        <div className="flex items-center space-x-6">
          <div className="h-20 w-20 rounded-full bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 text-3xl font-black shadow-sm">
            {user.email[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">{user.nombre_completo || 'Cliente MP Tech'}</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">{user.email}</p>
            {user.telefono && (
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                <i className="bi bi-telephone-fill mr-1.5 text-gray-400 dark:text-gray-500"></i> {user.telefono}
              </p>
            )}
          </div>
        </div>

        <div>
          {!editing ? (
            <button
              onClick={startEditing}
              className="px-6 py-3 border border-gray-200 dark:border-gray-700 hover:border-rose-250 dark:hover:border-rose-600/50 text-gray-700 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-500 font-bold rounded-xl transition-all hover:bg-rose-50/30 dark:hover:bg-rose-950/20 text-sm shadow-sm"
            >
              Editar Perfil
            </button>
          ) : (
            <button
              onClick={() => setEditing(false)}
              className="px-6 py-3 text-gray-500 hover:text-gray-300 font-bold text-sm"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Formulario de Edición */}
      {editing && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-md mb-10 max-w-xl transition-all duration-300">
          <h2 className="text-xl font-black text-gray-950 dark:text-white mb-6">Modificar datos personales</h2>
          <form onSubmit={handleEditProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nombre completo</label>
              <input
                type="text"
                required
                value={nombreCompleto}
                onChange={e => setNombreCompleto(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:focus:border-rose-500 focus:bg-white dark:focus:bg-gray-950 outline-none transition-all"
                placeholder="Ingresa tu nombre"
              />
            </div>
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

            {editError && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 text-red-650 dark:text-red-400 p-4 rounded-xl text-sm font-medium">
                {editError}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-gray-900 dark:bg-white hover:bg-rose-600 dark:hover:bg-rose-600 text-white dark:text-gray-900 dark:hover:text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50 text-sm"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>
      )}

      {editSuccess && (
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/50 text-green-600 dark:text-green-400 p-4 rounded-xl text-sm font-medium mb-10 max-w-xl">
          ✓ Datos guardados exitosamente.
        </div>
      )}

      {/* Historiales / Pestañas de Órdenes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Reparaciones / Órdenes de Servicio */}
        <div className="lg:col-span-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.25)] hover:border-rose-200 dark:hover:border-rose-900/50 transition-all duration-300 animate-slide-up delay-100">
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center">
            <i className="bi bi-tools mr-2 text-rose-600 dark:text-rose-400"></i> Reparaciones Solicitadas
          </h2>
          {orders.ordenes.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm py-4">No has solicitado reparaciones de equipos.</p>
          ) : (
            <div className="space-y-4">
              {orders.ordenes.map(o => (
                <div key={o.codigo} className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800/80 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-rose-100 dark:hover:border-rose-900/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white truncate">{o.equipo}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Falla: {o.falla}</p>
                    <Link to={`/rastrear?codigo=${o.codigo}`} className="inline-block mt-2 text-xs font-mono font-bold text-rose-600 dark:text-rose-400 hover:underline bg-rose-50 dark:bg-rose-950/20 px-2.5 py-0.5 rounded-full border border-rose-100 dark:border-rose-900/50">
                      {o.codigo} <i className="bi bi-search ml-1"></i>
                    </Link>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="inline-block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                      {o.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pedidos de Catálogo */}
        <div className="lg:col-span-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.25)] hover:border-rose-200 dark:hover:border-rose-900/50 transition-all duration-300 animate-slide-up delay-150">
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center">
            <i className="bi bi-bag-check mr-2 text-rose-600 dark:text-rose-400"></i> Pedidos de Catálogo
          </h2>
          {orders.pedidos_catalogo.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm py-4">Aún no tienes compras registradas en el catálogo.</p>
          ) : (
            <div className="space-y-4">
              {orders.pedidos_catalogo.map(p => (
                <div key={p.codigo} className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800/80 rounded-2xl hover:border-rose-100 dark:hover:border-rose-900/50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-450 bg-rose-50 dark:bg-rose-950/20 px-2.5 py-0.5 rounded-full border border-rose-100 dark:border-rose-900/50 text-xs">{p.codigo}</span>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{new Date(p.fecha).toLocaleDateString()}</p>
                    </div>
                    <span className="text-lg font-black text-gray-900 dark:text-white">${p.total.toFixed(2)}</span>
                  </div>
                  
                  <div className="border-t border-gray-200/60 dark:border-gray-800 pt-3">
                    <ul className="space-y-1">
                      {p.productos.map((item, idx) => (
                        <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex justify-between font-medium">
                          <span>{item.nombre} <span className="text-gray-400 dark:text-gray-500">x{item.cantidad}</span></span>
                          <span className="text-gray-500 dark:text-gray-300">${(item.precio * item.cantidad).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pedidos de Importación */}
        <div className="lg:col-span-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.25)] hover:border-rose-200 dark:hover:border-rose-900/50 transition-all duration-300 animate-slide-up delay-200">
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center">
            <i className="bi bi-airplane mr-2 text-rose-600 dark:text-rose-400 font-bold"></i> Pedidos de Importación
          </h2>
          {orders.importaciones.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm py-4">No has realizado cotizaciones de importación.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.importaciones.map(i => (
                <div key={i.codigo} className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800/80 rounded-2xl hover:border-rose-100 dark:hover:border-rose-900/50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <Link to={`/importacion/${i.codigo}`} className="inline-block font-mono font-bold text-rose-600 dark:text-rose-455 hover:underline bg-rose-50 dark:bg-rose-950/20 px-2.5 py-0.5 rounded-full border border-rose-100 dark:border-rose-900/50 text-xs">
                        {i.codigo} <i className="bi bi-search ml-1"></i>
                      </Link>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{new Date(i.fecha).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-md font-bold text-gray-950 dark:text-white">${i.total_usd.toFixed(2)}</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">≈ {i.total_ves.toFixed(2)} Bs.</p>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200/60 dark:border-gray-800 pt-3">
                    <ul className="space-y-1">
                      {i.productos.map((prod, idx) => (
                        <li key={idx} className="text-xs text-gray-650 dark:text-gray-400 font-medium">
                          • {prod.nombre || prod.url}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
