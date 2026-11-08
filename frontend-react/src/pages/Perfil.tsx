import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, Navigate } from 'react-router-dom';
import api from '../api/axios';
import PaymentModal from '../components/PaymentModal';

type FilterTab = 'all' | 'servicios' | 'compras' | 'importaciones';

export default function Perfil() {
  const { user, orders, loading, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [editing, setEditing] = useState<boolean>(false);
  const [nombreCompleto, setNombreCompleto] = useState<string>('');
  const [telefono, setTelefono] = useState<string>('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Estados para PaymentModal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentConcept, setPaymentConcept] = useState('');
  const [paymentAmountUsd, setPaymentAmountUsd] = useState(0);
  const [paymentAmountVes, setPaymentAmountVes] = useState<number | null>(null);
  const [paymentOrderCode, setPaymentOrderCode] = useState('');

  const handleOpenPayment = (
    concepto: string,
    amountUsd: number,
    amountVes: number | null,
    orderCode: string
  ) => {
    setPaymentConcept(concepto);
    setPaymentAmountUsd(amountUsd);
    setPaymentAmountVes(amountVes);
    setPaymentOrderCode(orderCode);
    setIsPaymentModalOpen(true);
  };

  if (loading) {
    return (
      <div
        className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6 animate-fade-in"
        role="status"
        aria-live="polite"
      >
        <div className="h-32 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 animate-pulse" />
          <div className="h-64 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 animate-pulse" />
        </div>
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
        telefono: telefono,
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

  const totalServicios = orders.ordenes?.length || 0;
  const totalCompras = orders.pedidos_catalogo?.length || 0;
  const totalImportaciones = orders.importaciones?.length || 0;
  const totalGeneral = totalServicios + totalCompras + totalImportaciones;

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in tabular-nums">
      {/* Header Perfil */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 sm:p-7 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-5 animate-slide-up">
        <div className="flex items-center gap-4 sm:gap-5 min-w-0 w-full">
          <div
            className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400 text-xl sm:text-2xl font-black flex-shrink-0"
            aria-hidden="true"
          >
            {user.email[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 break-words">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white leading-tight">
              {user.nombre_completo || 'Cliente MP Tech'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-xs sm:text-sm break-all mt-0.5">
              {user.email}
            </p>
            {user.telefono && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-semibold">
                <i className="bi bi-whatsapp mr-1 text-emerald-500" aria-hidden="true"></i>
                {user.telefono}
              </p>
            )}
          </div>
        </div>

        <div className="w-full md:w-auto flex-shrink-0">
          {!editing ? (
            <button
              type="button"
              onClick={startEditing}
              className="w-full md:w-auto px-4 py-2.5 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 font-bold rounded-xl transition-colors text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 flex items-center justify-center gap-1.5"
            >
              <i className="bi bi-pencil-square" aria-hidden="true"></i>
              Editar Datos
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="w-full md:w-auto px-4 py-2.5 text-gray-500 hover:text-gray-900 dark:hover:text-white font-bold text-xs sm:text-sm text-center rounded-xl border border-gray-200 dark:border-gray-800"
            >
              Cancelar edición
            </button>
          )}
        </div>
      </div>

      {/* Formulario de Edición */}
      {editing && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-md mb-6 max-w-xl w-full animate-slide-down">
          <h2 className="text-lg font-black text-gray-950 dark:text-white mb-4">
            Modificar datos de contacto
          </h2>
          <form onSubmit={handleEditProfile} className="space-y-4" noValidate>
            <div>
              <label htmlFor="nombreCompleto" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Nombre completo
              </label>
              <input
                id="nombreCompleto"
                type="text"
                autoComplete="name"
                required
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 font-medium"
                placeholder="Ingresa tu nombre"
              />
            </div>
            <div>
              <label htmlFor="telefonoPerfil" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Teléfono (WhatsApp)
              </label>
              <input
                id="telefonoPerfil"
                type="tel"
                autoComplete="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 font-medium tabular-nums"
                placeholder="Ej. +58 424 1234567"
              />
            </div>

            {editError && (
              <div
                className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs font-bold"
                role="alert"
              >
                {editError}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl transition-colors disabled:opacity-50 text-xs sm:text-sm"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>
      )}

      {editSuccess && (
        <div
          className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 p-3.5 rounded-2xl text-xs sm:text-sm font-bold mb-6 max-w-xl animate-fade-in flex items-center gap-2"
          role="status"
        >
          <i className="bi bi-check-circle-fill" aria-hidden="true"></i> Datos actualizados correctamente.
        </div>
      )}

      {/* Barra de Filtros por Tipo de Operación */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border ${
            activeTab === 'all'
              ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-950 dark:border-white'
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200/80 dark:border-gray-800 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Todas ({totalGeneral})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('servicios')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border flex items-center gap-1.5 ${
            activeTab === 'servicios'
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200/80 dark:border-gray-800 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <i className="bi bi-tools" aria-hidden="true"></i>
          Servicio Técnico ({totalServicios})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('compras')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border flex items-center gap-1.5 ${
            activeTab === 'compras'
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200/80 dark:border-gray-800 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <i className="bi bi-bag-check" aria-hidden="true"></i>
          Compras ({totalCompras})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('importaciones')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors border flex items-center gap-1.5 ${
            activeTab === 'importaciones'
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200/80 dark:border-gray-800 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <i className="bi bi-airplane" aria-hidden="true"></i>
          Importaciones ({totalImportaciones})
        </button>
      </div>

      {/* Historiales / Pestañas de Órdenes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start w-full">
        {/* Reparaciones / Órdenes de Servicio */}
        {(activeTab === 'all' || activeTab === 'servicios') && (
          <div
            className={`${
              activeTab === 'servicios' ? 'lg:col-span-12' : 'lg:col-span-6'
            } bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 sm:p-7 shadow-sm min-w-0 w-full`}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <i className="bi bi-tools text-primary-600 dark:text-primary-400" aria-hidden="true"></i>
                Órdenes de Servicio
              </h2>
              <Link
                to="/rastrear?solicitar=true"
                className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
              >
                + Nueva solicitud
              </Link>
            </div>

            {orders.ordenes.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <i className="bi bi-inbox text-2xl text-gray-300 dark:text-gray-700 mb-2" aria-hidden="true"></i>
                <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">
                  No has solicitado órdenes de servicio.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.ordenes.map((o) => (
                  <Link
                    key={o.codigo}
                    to={`/rastrear?codigo=${o.codigo}`}
                    className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-primary-300 dark:hover:border-primary-800 transition-colors min-w-0 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs font-black text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2.5 py-0.5 rounded-full border border-primary-100 dark:border-primary-900/50">
                          {o.codigo}
                        </span>
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                          {o.equipo}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        Falla: {o.falla}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                        {o.estado}
                      </span>
                      <i className="bi bi-chevron-right text-xs text-gray-400 group-hover:text-primary-600 transition-colors" aria-hidden="true"></i>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pedidos de Catálogo */}
        {(activeTab === 'all' || activeTab === 'compras') && (
          <div
            className={`${
              activeTab === 'compras' ? 'lg:col-span-12' : 'lg:col-span-6'
            } bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 sm:p-7 shadow-sm min-w-0 w-full`}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <i className="bi bi-bag-check text-primary-600 dark:text-primary-400" aria-hidden="true"></i>
                Órdenes de Compra
              </h2>
              <Link
                to="/catalogo"
                className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
              >
                Ir a la tienda
              </Link>
            </div>

            {orders.pedidos_catalogo.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <i className="bi bi-bag-x text-2xl text-gray-300 dark:text-gray-700 mb-2" aria-hidden="true"></i>
                <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">
                  Aún no tienes compras registradas en el catálogo.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.pedidos_catalogo.map((p) => (
                  <div
                    key={p.codigo}
                    className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800 rounded-2xl min-w-0"
                  >
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div className="min-w-0">
                        <span className="font-mono font-black text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2.5 py-0.5 rounded-full border border-primary-100 dark:border-primary-900/50 text-xs">
                          {p.codigo}
                        </span>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 font-medium">
                          {new Date(p.fecha).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <span className="text-base font-black text-gray-900 dark:text-white flex-shrink-0">
                        ${p.total.toFixed(2)}
                      </span>
                    </div>

                    <div className="border-t border-gray-200/60 dark:border-gray-800 pt-2.5">
                      <ul className="space-y-1">
                        {p.productos.map((item: any, idx: number) => (
                          <li
                            key={idx}
                            className="text-xs text-gray-600 dark:text-gray-400 flex justify-between font-medium gap-3"
                          >
                            <span className="truncate">
                              {item.nombre}{' '}
                              <span className="text-gray-400 dark:text-gray-500 font-bold ml-1">
                                ×{item.cantidad}
                              </span>
                            </span>
                            <span className="text-gray-700 dark:text-gray-300 flex-shrink-0 font-bold">
                              ${(item.precio * item.cantidad).toFixed(2)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {p.estado_raw === 'PENDIENTE' && (
                      <div className="mt-3.5 border-t border-gray-100 dark:border-gray-800 pt-3.5">
                        {p.estado_pago === 'PENDIENTE' ? (
                          <div className="w-full py-2 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-bold rounded-xl border border-amber-200 dark:border-amber-900/50 flex items-center justify-center gap-1.5 text-xs">
                            <i className="bi bi-hourglass-split" aria-hidden="true"></i> Verificando Pago
                          </div>
                        ) : p.estado_pago === 'VERIFICADO' ? (
                          <div className="w-full py-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-bold rounded-xl border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center gap-1.5 text-xs">
                            <i className="bi bi-check-circle-fill" aria-hidden="true"></i> Pago verificado
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenPayment(
                                'Pago de Pedido de Catálogo',
                                p.total,
                                p.total_ves || null,
                                p.codigo
                              )
                            }
                            className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-colors text-xs shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <i className="bi bi-wallet2" aria-hidden="true"></i> Reportar Pago
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pedidos de Importación */}
        {(activeTab === 'all' || activeTab === 'importaciones') && (
          <div className="lg:col-span-12 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 sm:p-7 shadow-sm min-w-0 w-full">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <i className="bi bi-airplane text-primary-600 dark:text-primary-400" aria-hidden="true"></i>
                Pedidos de Importación
              </h2>
              <Link
                to="/importaciones"
                className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
              >
                + Nueva cotización
              </Link>
            </div>

            {orders.importaciones.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <i className="bi bi-box-seam text-2xl text-gray-300 dark:text-gray-700 mb-2" aria-hidden="true"></i>
                <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">
                  No has realizado cotizaciones de importación.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {orders.importaciones.map((i) => (
                  <Link
                    key={i.codigo}
                    to={`/importacion/${i.codigo}`}
                    className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200/60 dark:border-gray-800 rounded-2xl hover:border-primary-300 dark:hover:border-primary-800 transition-colors min-w-0 group"
                  >
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1 font-mono font-black text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2.5 py-0.5 rounded-full border border-primary-100 dark:border-primary-900/50 text-xs">
                          {i.codigo}
                        </span>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 font-medium">
                          {new Date(i.fecha).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-base font-black text-gray-900 dark:text-white">
                          ${i.total_usd.toFixed(2)}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          ≈ {i.total_ves.toFixed(2)} Bs
                        </p>
                      </div>
                    </div>

                    <div className="border-t border-gray-200/60 dark:border-gray-800 pt-2.5 flex items-center justify-between gap-2">
                      <ul className="space-y-1 min-w-0 flex-1">
                        {i.productos.slice(0, 2).map((prod: any, idx: number) => (
                          <li
                            key={idx}
                            className="text-xs text-gray-600 dark:text-gray-400 font-medium truncate"
                          >
                            • {prod.nombre || prod.tienda || prod.url}
                          </li>
                        ))}
                      </ul>
                      <span className="text-xs font-bold text-primary-600 dark:text-primary-400 shrink-0 flex items-center gap-1">
                        Ver detalle <i className="bi bi-arrow-right transition-transform group-hover:translate-x-0.5" aria-hidden="true"></i>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        concept={paymentConcept}
        amountUsd={paymentAmountUsd}
        amountVes={paymentAmountVes}
        orderCode={paymentOrderCode}
        clientName={user.nombre_completo || user.email}
        orderType="catalogo"
        onNotifyComplete={async () => {
          setIsPaymentModalOpen(false);
          await refreshUser();
        }}
      />
    </div>
  );
}
