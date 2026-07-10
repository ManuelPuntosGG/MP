import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, Navigate } from 'react-router-dom';
import api from '../api/axios';

export default function Perfil() {
  const { user, orders, loading, refreshUser } = useAuth();
  
  const [editing, setEditing] = useState<boolean>(false);
  const [nombreCompleto, setNombreCompleto] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-gray-50/50 dark:bg-gray-950/20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600" aria-label="Cargando perfil"></div>
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

  const handleEditProfile = async (e: React.FormEvent<HTMLFormElement>) => {
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
    } catch (err: any) {
      setEditError(err.response?.data?.error || 'Error al actualizar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 bg-gray-50/50 dark:bg-gray-950/20 transition-colors duration-200 animate-fade-in overflow-hidden">
      
      {/* Header Perfil - Corregido para Mobile */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-8 shadow-sm hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.25)] hover:border-primary-100 dark:hover:border-primary-900/50 transition-all duration-200 mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 animate-slide-up">
        <div className="flex items-center gap-4 sm:gap-6 min-w-0 w-full">
          {/* Avatar con flex-shrink-0 para que no se deforme */}
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary-50 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400 text-2xl sm:text-3xl font-black shadow-sm flex-shrink-0 transition-colors duration-200" aria-hidden="true">
            {user.email[0].toUpperCase()}
          </div>
          {/* Contenedor de texto con min-w-0 y break-words para evitar desbordamientos */}
          <div className="min-w-0 flex-1 break-words">
            <h1 className="text-xl sm:text-3xl font-black text-gray-900 dark:text-white leading-tight">
              {user.nombre_completo || 'Cliente MP Tech'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm sm:text-base break-all">
              {user.email}
            </p>
            {user.telefono && (
              <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1">
                <i className="bi bi-telephone-fill mr-1.5 text-gray-400 dark:text-gray-500" aria-hidden="true"></i> {user.telefono}
              </p>
            )}
          </div>
        </div>

        <div className="w-full md:w-auto flex-shrink-0">
          {!editing ? (
            <button
              onClick={startEditing}
              className="w-full md:w-auto px-6 py-3 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600/50 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-500 font-bold rounded-xl transition-all duration-200 hover:bg-primary-50/30 dark:hover:bg-primary-950/20 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              Editar Perfil
            </button>
          ) : (
            <button
              onClick={() => setEditing(false)}
              className="w-full md:w-auto px-6 py-3 text-gray-500 hover:text-gray-300 font-bold text-sm text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 rounded-xl"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Formulario de Edición */}
      {editing && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-md mb-10 max-w-xl w-full transition-all duration-200">
          <h2 className="text-xl font-black text-gray-950 dark:text-white mb-6">Modificar datos personales</h2>
          <form onSubmit={handleEditProfile} className="space-y-4" noValidate>
            <div>
              <label htmlFor="nombreCompleto" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nombre completo</label>
              <input
                id="nombreCompleto"
                type="text"
                required
                value={nombreCompleto}
                onChange={e => setNombreCompleto(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-500 focus:bg-white dark:focus:bg-gray-950 transition-all duration-200"
                placeholder="Ingresa tu nombre"
              />
            </div>
            <div>
              <label htmlFor="telefono" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Teléfono (WhatsApp)</label>
              <input
                id="telefono"
                type="tel"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-500 focus:bg-white dark:focus:bg-gray-950 transition-all duration-200"
                placeholder="Ej. +584241234567"
              />
            </div>

            {editError && (
              <div 
                className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium animate-fade-in"
                role="alert"
                aria-live="polite"
              >
                {typeof editError === 'string' ? editError : (editError.message || JSON.stringify(editError))}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-3 bg-gray-900 dark:bg-white hover:bg-primary-600 dark:hover:bg-primary-600 text-white dark:text-gray-900 dark:hover:text-white font-bold rounded-xl transition-all duration-200 shadow-md disabled:opacity-50 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-gray-900 flex items-center justify-center"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </span>
              ) : 'Guardar Cambios'}
            </button>
          </form>
        </div>
      )}

      {editSuccess && (
        <div 
          className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-sm font-medium mb-10 max-w-xl animate-fade-in flex items-center gap-2"
          role="status"
          aria-live="polite"
        >
          <i className="bi bi-check-circle-fill" aria-hidden="true"></i> Datos guardados exitosamente.
        </div>
      )}

      {/* Historiales / Pestañas de Órdenes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
        
        {/* Reparaciones / Órdenes de Servicio */}
        <div className="lg:col-span-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-8 shadow-sm hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.25)] hover:border-primary-200 dark:hover:border-primary-900/50 transition-all duration-200 animate-slide-up delay-100 min-w-0 w-full">
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center">
            <i className="bi bi-tools mr-2 text-primary-600 dark:text-primary-400" aria-hidden="true"></i> Ordenes de Servicio
          </h2>
          {orders.ordenes.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <i className="bi bi-inbox text-3xl text-gray-300 dark:text-gray-600 mb-2" aria-hidden="true"></i>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No has solicitado órdenes de servicio.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.ordenes.map(o => (
                <div key={o.codigo} className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800/80 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-primary-100 dark:hover:border-primary-900/50 transition-colors duration-200 min-w-0 group">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white truncate">{o.equipo}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">Falla: {o.falla}</p>
                    <Link 
                      to={`/rastrear?codigo=${o.codigo}`} 
                      className="inline-flex items-center gap-1 mt-2 text-xs font-mono font-bold text-primary-600 dark:text-primary-400 hover:underline bg-primary-50 dark:bg-primary-950/20 px-2.5 py-1 rounded-full border border-primary-100 dark:border-primary-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors"
                      aria-label={`Ver estado de la orden de reparación ${o.codigo}`}
                    >
                      {o.codigo} <i className="bi bi-search ml-0.5" aria-hidden="true"></i>
                    </Link>
                  </div>
                  <div className="flex-shrink-0 w-full sm:w-auto text-left sm:text-right">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 w-full sm:w-auto text-center">
                      {o.estado}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pedidos de Catálogo */}
        <div className="lg:col-span-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-8 shadow-sm hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.25)] hover:border-primary-200 dark:hover:border-primary-900/50 transition-all duration-200 animate-slide-up delay-150 min-w-0 w-full">
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center">
            <i className="bi bi-bag-check mr-2 text-primary-600 dark:text-primary-400" aria-hidden="true"></i> Ordenes de Compra
          </h2>
          {orders.pedidos_catalogo.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <i className="bi bi-bag-x text-3xl text-gray-300 dark:text-gray-600 mb-2" aria-hidden="true"></i>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Aún no tienes compras registradas en el catálogo.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.pedidos_catalogo.map(p => (
                <div key={p.codigo} className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800/80 rounded-2xl hover:border-primary-100 dark:hover:border-primary-900/50 transition-colors duration-200 min-w-0">
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div className="min-w-0">
                      <span className="font-mono font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/20 px-2.5 py-0.5 rounded-full border border-primary-100 dark:border-primary-900/50 text-xs">{p.codigo}</span>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-medium">{new Date(p.fecha).toLocaleDateString()}</p>
                    </div>
                    <span className="text-lg font-black text-gray-900 dark:text-white flex-shrink-0">${p.total.toFixed(2)}</span>
                  </div>
                  
                  <div className="border-t border-gray-200/60 dark:border-gray-800 pt-3">
                    <ul className="space-y-1.5">
                      {p.productos.map((item: any, idx: number) => (
                        <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex justify-between font-medium gap-4">
                          <span className="truncate">{item.nombre} <span className="text-gray-400 dark:text-gray-500 flex-shrink-0 ml-1">x{item.cantidad}</span></span>
                          <span className="text-gray-500 dark:text-gray-300 flex-shrink-0 font-bold">${(item.precio * item.cantidad).toFixed(2)}</span>
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
        <div className="lg:col-span-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-5 sm:p-8 shadow-sm hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.25)] hover:border-primary-200 dark:hover:border-primary-900/50 transition-all duration-200 animate-slide-up delay-200 min-w-0 w-full">
          <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6 flex items-center">
            <i className="bi bi-airplane mr-2 text-primary-600 dark:text-primary-400 font-bold" aria-hidden="true"></i> Pedidos de Importación
          </h2>
          {orders.importaciones.length === 0 ? (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <i className="bi bi-box-seam text-3xl text-gray-300 dark:text-gray-600 mb-2" aria-hidden="true"></i>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No has realizado cotizaciones de importación.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {orders.importaciones.map(i => (
                <div key={i.codigo} className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800/80 rounded-2xl hover:border-primary-100 dark:hover:border-primary-900/50 transition-colors duration-200 min-w-0">
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div className="min-w-0">
                      <Link 
                        to={`/importacion/${i.codigo}`} 
                        className="inline-flex items-center gap-1 font-mono font-bold text-primary-600 dark:text-primary-400 hover:underline bg-primary-50 dark:bg-primary-950/20 px-2.5 py-1 rounded-full border border-primary-100 dark:border-primary-900/50 text-xs max-w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        aria-label={`Ver detalles de la importación ${i.codigo}`}
                      >
                        <span className="truncate">{i.codigo}</span> <i className="bi bi-search ml-0.5" aria-hidden="true"></i>
                      </Link>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-medium">{new Date(i.fecha).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-md font-bold text-gray-900 dark:text-white">${i.total_usd.toFixed(2)}</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">≈ {i.total_ves.toFixed(2)} Bs.</p>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200/60 dark:border-gray-800 pt-3">
                    <ul className="space-y-1.5">
                      {i.productos.map((prod: any, idx: number) => (
                        <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 font-medium truncate" title={prod.nombre || prod.url}>
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