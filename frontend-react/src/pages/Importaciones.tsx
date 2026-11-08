import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const TARIFA_LIBRA = 6.50;
const COMISION_MINIMA = 7.00;
const STORAGE_KEY = 'mptech_import_cart';
const TELEFONO_WHATSAPP = '584245022292';

interface ImportItem {
  id: number;
  tienda: string;
  url: string;
  precio: number;
  peso: number;
}

export default function Importaciones() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ImportItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [tasaVes, setTasaVes] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successCode, setSuccessCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Form Inputs
  const [url, setUrl] = useState<string>('');
  const [precio, setPrecio] = useState<string>('');
  const [peso, setPeso] = useState<string>('1');
  const [addError, setAddError] = useState<string | null>(null);

  // Confirmación integrada para limpiar lista (evita window.confirm nativo)
  const [confirmingClear, setConfirmingClear] = useState<boolean>(false);

  // Checkout inputs for anonymous users
  const [anonNombre, setAnonNombre] = useState<string>('');
  const [anonTelefono, setAnonTelefono] = useState<string>('');
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [searchCode, setSearchCode] = useState<string>('');

  useEffect(() => {
    const fetchTasa = async () => {
      try {
        const response = await api.get('/tasa/');
        setTasaVes(response.data.tasa_ves);
      } catch (err) {
        console.error('Error fetching rate:', err);
      }
    };
    fetchTasa();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // Cerrar modal con Escape y bloquear scroll (fixing-accessibility)
  useEffect(() => {
    if (!showCheckoutModal) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowCheckoutModal(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showCheckoutModal]);

  const detectarTienda = (productUrl: string) => {
    const urlLower = productUrl.toLowerCase();
    if (urlLower.includes('amazon') || urlLower.includes('a.co')) return 'Amazon';
    if (urlLower.includes('aliexpress')) return 'AliExpress';
    if (urlLower.includes('ebay')) return 'eBay';
    if (urlLower.includes('newegg')) return 'Newegg';
    return 'Otro';
  };

  const detectedStorePreview = url.trim() ? detectarTienda(url) : null;

  const handleAddItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddError(null);

    if (!url.trim()) {
      setAddError('Ingresa el enlace del producto que deseas cotizar.');
      return;
    }

    const precioFloat = parseFloat(precio) || 0;
    const pesoInt = parseInt(peso, 10) || 1;

    if (precioFloat <= 0) {
      setAddError('Ingresa un precio válido en dólares mayor a $0.00.');
      return;
    }

    if (pesoInt <= 0) {
      setAddError('El peso estimado debe ser de al menos 1 libra.');
      return;
    }

    const newItem: ImportItem = {
      id: Date.now(),
      tienda: detectarTienda(url),
      url: url.trim(),
      precio: precioFloat,
      peso: pesoInt,
    };

    setItems([...items, newItem]);
    setUrl('');
    setPrecio('');
    setPeso('1');
  };

  const handleModifyItem = (id: number, field: keyof ImportItem, value: string) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          let numVal = field === 'peso' ? parseInt(value, 10) || 1 : parseFloat(value) || 0.01;
          if (numVal <= 0) numVal = field === 'peso' ? 1 : 0.01;
          return { ...item, [field]: numVal };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (id: number) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const handleClearList = () => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
    setConfirmingClear(false);
  };

  // Cálculos de Totales
  const totals = useMemo(() => {
    const totalFob = items.reduce((sum, item) => sum + item.precio, 0);
    const totalFlete = items.reduce((sum, item) => sum + item.peso * TARIFA_LIBRA, 0);

    let porcentajeComision = 0.1;
    if (totalFob >= 200 && totalFob <= 1000) {
      porcentajeComision = 0.075;
    } else if (totalFob > 1000) {
      porcentajeComision = 0.05;
    }

    const totalComision =
      items.length > 0 ? Math.max(totalFob * porcentajeComision, COMISION_MINIMA) : 0;

    const totalGeneral = totalFob + totalFlete + totalComision;
    const inicial50 = totalGeneral / 2;

    return {
      fobUsd: totalFob,
      fobBs: tasaVes ? totalFob * parseFloat(tasaVes) : 0,
      fleteUsd: totalFlete,
      fleteBs: tasaVes ? totalFlete * parseFloat(tasaVes) : 0,
      porcentajeComision,
      comisionUsd: totalComision,
      comisionBs: tasaVes ? totalComision * parseFloat(tasaVes) : 0,
      totalUsd: totalGeneral,
      totalBs: tasaVes ? totalGeneral * parseFloat(tasaVes) : 0,
      inicialUsd: inicial50,
      inicialBs: tasaVes ? inicial50 * parseFloat(tasaVes) : 0,
    };
  }, [items, tasaVes]);

  const triggerCheckout = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (items.length === 0) return;
    setCheckoutError(null);

    if (user) {
      processOrder(user.nombre_completo || user.email, user.telefono || '');
    } else {
      setShowCheckoutModal(true);
    }
  };

  const processOrder = async (nombre: string, telefono: string) => {
    if (!nombre.trim() || !telefono.trim()) {
      setCheckoutError('Por favor ingresa tu nombre y número de WhatsApp.');
      return;
    }

    setSubmitting(true);
    setCheckoutError(null);

    try {
      const response = await api.post('/guardar-importacion/', {
        productos: items,
        total_usd: totals.totalUsd,
        total_ves: totals.totalBs,
        nombre: nombre.trim(),
        telefono: telefono.trim(),
      });

      if (response.data.success) {
        if (user) refreshUser();
        setSuccessCode(response.data.codigo);
        sendWhatsAppMessage(nombre.trim(), telefono.trim());
        setItems([]);
        localStorage.removeItem(STORAGE_KEY);
        setShowCheckoutModal(false);
      }
    } catch (err: any) {
      setCheckoutError(
        err.response?.data?.error || 'Error al registrar la cotización en el servidor.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const sendWhatsAppMessage = (nombre: string, telefono: string) => {
    const rateVal = tasaVes ? parseFloat(tasaVes) : 0;

    const messageLines = [
      '¡Hola *MP Tech*!',
      '',
      'Me gustaría solicitar la cotización formal e importación de los siguientes artículos:',
      '',
    ];

    items.forEach((item, i) => {
      const itemPrecioBs = rateVal ? item.precio * rateVal : 0;
      messageLines.push(`📦 *Artículo #${i + 1}* (${item.tienda})`);
      messageLines.push(`🔗 *Enlace:* ${item.url}`);
      messageLines.push(
        `💵 *Precio:* $${item.precio.toFixed(2)} (~${itemPrecioBs.toFixed(2)} Bs) | ⚖️ *Peso:* ${item.peso.toFixed(1)} Lbs`
      );
      messageLines.push('');
    });

    messageLines.push('----------------------------------');
    messageLines.push('📊 *DESGLOSE ESTIMADO DEL PEDIDO:*');
    messageLines.push(
      `💰 *TOTAL GENERAL ESTIMADO:* *$${totals.totalUsd.toFixed(2)}* (*${totals.totalBs.toFixed(2)} Bs*)`
    );
    messageLines.push('');
    messageLines.push(
      `💵 *Abono inicial (50% para iniciar):* $${totals.inicialUsd.toFixed(2)} (*${totals.inicialBs.toFixed(2)} Bs*)`
    );
    messageLines.push(
      `💵 *Monto al retirar (50% restante al retirar):* $${totals.inicialUsd.toFixed(2)} (*${totals.inicialBs.toFixed(2)} Bs*)`
    );
    messageLines.push('');
    messageLines.push(
      '⚠️ _Acepto que los valores son estimados y la cotización final puede variar de acuerdo al pesaje y cubicaje definitivo medido en el almacén de origen._'
    );

    if (nombre && telefono) {
      messageLines.push('');
      messageLines.push(`👤 *Nombre:* ${nombre}`);
      messageLines.push(`📞 *Teléfono:* ${telefono}`);
    }

    const encodedMessage = encodeURIComponent(messageLines.join('\n'));
    window.open(`https://wa.me/${TELEFONO_WHATSAPP}?text=${encodedMessage}`, '_blank');
  };

  const getStoreBadgeClasses = (tienda: string) => {
    switch (tienda) {
      case 'Amazon':
        return 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/50';
      case 'AliExpress':
        return 'bg-orange-50 text-orange-800 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-900/50';
      case 'eBay':
        return 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900/50';
      case 'Newegg':
        return 'bg-indigo-50 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/50';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  if (successCode) {
    return (
      <div className="min-h-[75dvh] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-7 sm:p-8 text-center shadow-xl animate-scale-in">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-emerald-200/60 dark:border-emerald-900/50">
            <i className="bi bi-check-lg text-3xl" aria-hidden="true"></i>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2">
            ¡Cotización Registrada!
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Tu código de seguimiento de importación es:
          </p>
          <div className="bg-primary-50/70 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/50 py-3.5 px-5 rounded-2xl mb-6 flex items-center justify-center gap-3">
            <span className="text-2xl sm:text-3xl font-mono font-black tracking-widest text-primary-600 dark:text-primary-400 tabular-nums">
              {successCode}
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(successCode);
                setCopiedCode(true);
                setTimeout(() => setCopiedCode(false), 2000);
              }}
              className="p-2 rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/50 text-primary-600 dark:text-primary-400 transition-colors"
              aria-label="Copiar código de importación"
              title="Copiar código"
            >
              <i className={`bi ${copiedCode ? 'bi-check2 text-emerald-500' : 'bi-clipboard'}`} aria-hidden="true"></i>
            </button>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            Hemos abierto WhatsApp para enviar el desglose a nuestro agente logístico y concretar tu pedido.
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => navigate(`/importacion/${successCode}`)}
              className="w-full py-3.5 px-4 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold transition-colors text-sm shadow-sm"
            >
              Ver Estado de mi Importación
            </button>
            <button
              type="button"
              onClick={() => setSuccessCode(null)}
              className="w-full py-3 px-4 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold transition-colors text-sm"
            >
              Crear Nueva Cotización
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden pb-16">
      {/* Background glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-80 bg-primary-600/8 dark:bg-primary-600/12 blur-3xl rounded-full pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
        {/* Cabecera y Tasa */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white">
              Pedidos de <span className="text-primary-600 dark:text-primary-400">Importación</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1.5 font-medium">
              Cotiza el costo total de traer tus productos de Amazon, AliExpress, eBay y más tiendas hasta Venezuela.
            </p>
          </div>
          {tasaVes && (
            <div className="inline-flex items-center self-start md:self-auto px-3.5 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 font-bold text-xs border border-primary-100 dark:border-primary-900/50 tabular-nums">
              <i className="bi bi-currency-exchange mr-2" aria-hidden="true"></i>
              Tasa BCV: {parseFloat(tasaVes).toFixed(2)} Bs/$
            </div>
          )}
        </div>

        {/* Formulario Adicionar Artículo */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm mb-6 animate-slide-up delay-75">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              Añadir artículo a cotización
            </h2>
            {detectedStorePreview && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStoreBadgeClasses(
                  detectedStorePreview
                )}`}
              >
                <i className="bi bi-Bag-check" aria-hidden="true"></i>
                Tienda detectada: {detectedStorePreview}
              </span>
            )}
          </div>

          <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end" noValidate>
            <div className="md:col-span-6">
              <label htmlFor="urlProducto" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Enlace del producto (URL)
              </label>
              <input
                id="urlProducto"
                type="url"
                required
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (addError) setAddError(null);
                }}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 focus:bg-white dark:focus:bg-gray-900 transition-colors text-sm font-medium"
                placeholder="https://www.amazon.com/dp/..."
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="precioProducto" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Precio Tienda ($)
              </label>
              <input
                id="precioProducto"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={precio}
                onChange={(e) => {
                  setPrecio(e.target.value);
                  if (addError) setAddError(null);
                }}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 focus:bg-white dark:focus:bg-gray-900 transition-colors text-sm font-bold tabular-nums"
                placeholder="0.00"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="pesoProducto" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                Peso Est. (Lbs)
              </label>
              <input
                id="pesoProducto"
                type="number"
                step="1"
                min="1"
                required
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 focus:bg-white dark:focus:bg-gray-900 transition-colors text-sm font-bold tabular-nums"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 px-4 h-[42px] rounded-xl transition-colors duration-150 text-sm flex items-center justify-center gap-1.5 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-gray-900"
              >
                <i className="bi bi-plus-lg text-sm" aria-hidden="true"></i>
                Añadir
              </button>
            </div>
          </form>

          {addError && (
            <p className="mt-3 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5 animate-fade-in" role="alert">
              <i className="bi bi-exclamation-circle-fill" aria-hidden="true"></i>
              {addError}
            </p>
          )}
        </div>

        {/* Tabla / Lista de Artículos */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm mb-6 animate-slide-up delay-150">
          <div className="flex flex-wrap justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800 gap-2">
            <h2 className="text-base font-bold text-gray-900 dark:text-white tabular-nums">
              Artículos Cotizados ({items.length})
            </h2>
            {items.length > 0 && (
              <div className="flex items-center gap-2">
                {confirmingClear ? (
                  <>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">¿Vaciar lista?</span>
                    <button
                      type="button"
                      onClick={handleClearList}
                      className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                    >
                      Sí, vaciar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingClear(false)}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold transition-colors"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingClear(true)}
                    className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-lg px-2.5 py-1"
                  >
                    <i className="bi bi-trash3" aria-hidden="true"></i>
                    Limpiar Lista
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Vista Desktop (Tabla) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse tabular-nums">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-950/50 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-3.5">Tienda</th>
                  <th className="px-6 py-3.5">Enlace</th>
                  <th className="px-6 py-3.5 text-center">Precio ($)</th>
                  <th className="px-6 py-3.5 text-center">Peso (Lbs)</th>
                  <th className="px-6 py-3.5 text-right">Flete Estimado</th>
                  <th className="px-6 py-3.5 text-center w-20">Quitar</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-14 text-center text-gray-500 dark:text-gray-400 text-sm">
                      <i className="bi bi-box-seam text-gray-300 dark:text-gray-700 text-4xl mb-2.5 block" aria-hidden="true"></i>
                      Pega el enlace de cualquier producto arriba para calcular su importación.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const flete = item.peso * TARIFA_LIBRA;
                    const fleteBs = tasaVes ? flete * parseFloat(tasaVes) : 0;

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50/50 dark:hover:bg-gray-950/30 transition-colors"
                      >
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border ${getStoreBadgeClasses(
                              item.tienda
                            )}`}
                          >
                            {item.tienda}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 max-w-[240px] truncate">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Ver artículo en ${item.tienda}`}
                            className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-sm"
                          >
                            <span>Ver producto original</span>
                            <i className="bi bi-box-arrow-up-right text-[11px]" aria-hidden="true"></i>
                          </a>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            aria-label={`Precio del artículo ${item.tienda}`}
                            value={item.precio}
                            onChange={(e) => handleModifyItem(item.id, 'precio', e.target.value)}
                            className="w-24 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg py-1.5 px-2 text-center text-sm font-bold text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 tabular-nums"
                          />
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <input
                            type="number"
                            step="1"
                            min="1"
                            aria-label={`Peso del artículo ${item.tienda}`}
                            value={item.peso}
                            onChange={(e) => handleModifyItem(item.id, 'peso', e.target.value)}
                            className="w-20 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg py-1.5 px-2 text-center text-sm font-bold text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 tabular-nums"
                          />
                        </td>
                        <td className="px-6 py-3.5 text-sm text-right">
                          <span className="font-bold text-gray-900 dark:text-white">${flete.toFixed(2)}</span>
                          {tasaVes && (
                            <span className="block text-xs text-gray-500 dark:text-gray-400 font-medium">
                              ≈ {fleteBs.toFixed(2)} Bs
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="w-8 h-8 inline-flex items-center justify-center text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            title="Eliminar artículo"
                            aria-label={`Eliminar artículo de ${item.tienda}`}
                          >
                            <i className="bi bi-trash3 text-sm" aria-hidden="true"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Vista Móvil */}
          <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-800/60 tabular-nums">
            {items.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                <i className="bi bi-box-seam text-gray-300 dark:text-gray-700 text-4xl mb-2.5 block" aria-hidden="true"></i>
                No has añadido ningún producto a tu lista de cotización todavía.
              </div>
            ) : (
              items.map((item) => {
                const flete = item.peso * TARIFA_LIBRA;
                const fleteBs = tasaVes ? flete * parseFloat(tasaVes) : 0;

                return (
                  <div key={item.id} className="p-4 space-y-3.5">
                    <div className="flex justify-between items-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border ${getStoreBadgeClasses(
                          item.tienda
                        )}`}
                      >
                        {item.tienda}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-primary-600 rounded-lg"
                        aria-label={`Eliminar artículo ${item.tienda}`}
                      >
                        <i className="bi bi-trash3 text-sm" aria-hidden="true"></i>
                      </button>
                    </div>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
                    >
                      Ver enlace original <i className="bi bi-box-arrow-up-right text-[10px]" aria-hidden="true"></i>
                    </a>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                          Precio ($)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.precio}
                          onChange={(e) => handleModifyItem(item.id, 'precio', e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl py-2 px-3 text-sm font-bold text-gray-900 dark:text-white tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                          Peso (Lbs)
                        </label>
                        <input
                          type="number"
                          step="1"
                          value={item.peso}
                          onChange={(e) => handleModifyItem(item.id, 'peso', e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl py-2 px-3 text-sm font-bold text-gray-900 dark:text-white tabular-nums"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-800/50 text-xs">
                      <span className="font-bold uppercase tracking-wider text-gray-400">Flete Estimado:</span>
                      <div className="text-right">
                        <span className="font-bold text-gray-900 dark:text-white">${flete.toFixed(2)}</span>
                        {tasaVes && (
                          <span className="text-gray-500 dark:text-gray-400 ml-1.5">
                            (≈ {fleteBs.toFixed(2)} Bs)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Resumen Estimado */}
        {items.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm mb-6 animate-scale-in tabular-nums">
            <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white mb-5">
              Resumen Estimado de Importación
            </h3>

            <div className="space-y-3.5 border-b border-gray-100 dark:border-gray-800 pb-5 mb-5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 font-medium">
                  Total Mercancía (Valor FOB):
                </span>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">${totals.fobUsd.toFixed(2)}</p>
                  {tasaVes && <p className="text-xs text-gray-400">≈ {totals.fobBs.toFixed(2)} Bs</p>}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 font-medium">
                  Flete Aéreo Consolidado (${TARIFA_LIBRA.toFixed(2)}/Lb):
                </span>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">${totals.fleteUsd.toFixed(2)}</p>
                  {tasaVes && <p className="text-xs text-gray-400">≈ {totals.fleteBs.toFixed(2)} Bs</p>}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 font-medium">
                  Gestión y Seguro Operativo ({(totals.porcentajeComision * 100).toFixed(1)}%):
                </span>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">${totals.comisionUsd.toFixed(2)}</p>
                  {tasaVes && <p className="text-xs text-gray-400">≈ {totals.comisionBs.toFixed(2)} Bs</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-baseline mb-5">
              <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Total General Estimado:
              </span>
              <div className="text-right">
                <p className="text-2xl sm:text-3xl font-black text-primary-600 dark:text-primary-500">
                  ${totals.totalUsd.toFixed(2)}
                </p>
                {tasaVes && (
                  <p className="text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-300 mt-0.5">
                    ≈ {totals.totalBs.toFixed(2)} Bs
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <div className="bg-primary-50/60 dark:bg-primary-950/25 border border-primary-100 dark:border-primary-900/50 rounded-2xl p-3.5 flex items-center justify-between">
                <span className="text-xs font-bold text-primary-700 dark:text-primary-300">
                  1. Abono Inicial (50%):
                </span>
                <span className="text-sm font-black text-primary-700 dark:text-primary-300">
                  ${totals.inicialUsd.toFixed(2)}
                </span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200/70 dark:border-gray-800 rounded-2xl p-3.5 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                  2. Al Retirar en Tienda (50%):
                </span>
                <span className="text-sm font-black text-gray-900 dark:text-white">
                  ${totals.inicialUsd.toFixed(2)}
                </span>
              </div>
            </div>

            {checkoutError && !showCheckoutModal && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold" role="alert">
                {checkoutError}
              </div>
            )}

            <button
              type="button"
              onClick={triggerCheckout}
              disabled={submitting}
              className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3.5 px-6 rounded-xl transition-colors duration-150 shadow-md shadow-primary-600/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-gray-900 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {submitting ? (
                <span>Procesando cotización...</span>
              ) : (
                <>
                  <i className="bi bi-whatsapp text-base" aria-hidden="true"></i>
                  <span>Registrar y Solicitar por WhatsApp</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Condiciones Logísticas + Consultar Estatus en Grid de 2 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up delay-200">
          {/* Políticas */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-xl flex items-center justify-center flex-shrink-0">
              <i className="bi bi-info-circle text-lg" aria-hidden="true"></i>
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white mb-2">
                Condiciones generales de cotización
              </h3>
              <ul className="list-disc pl-4 space-y-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed tabular-nums">
                <li>
                  <strong className="text-gray-700 dark:text-gray-300">Comisión escalonada:</strong> 10% (&lt; $200), 7.5% ($200–$1000) y 5% (&gt; $1000), mínimo $7.00.
                </li>
                <li>
                  <strong className="text-gray-700 dark:text-gray-300">Cálculo definitivo:</strong> El flete final se ajusta según el peso/volumen real medido en nuestro almacén receptor de Miami.
                </li>
              </ul>
            </div>
          </div>

          {/* Consultar Estatus */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white mb-1">
                Consultar Estatus de Importación
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium">
                Ingresa tu código de orden para ver el tracking y pagos abonados.
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchCode.trim()) navigate(`/importacion/${searchCode.trim().toUpperCase()}`);
              }}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <label htmlFor="searchCode" className="sr-only">
                Código de Orden
              </label>
              <input
                id="searchCode"
                type="text"
                required
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                className="flex-1 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 text-sm font-mono font-bold uppercase tabular-nums"
                placeholder="Ej. IMP-1234"
              />
              <button
                type="submit"
                disabled={!searchCode.trim()}
                className="px-5 py-2.5 bg-gray-900 hover:bg-primary-600 dark:bg-white dark:text-gray-950 dark:hover:bg-primary-500 dark:hover:text-white text-white font-bold rounded-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2 text-xs sm:text-sm whitespace-nowrap"
              >
                <i className="bi bi-search" aria-hidden="true"></i>
                Consultar
              </button>
            </form>
          </div>
        </div>

        {/* Checkout Modal for Anonymous Users */}
        {showCheckoutModal && (
          <div
            onClick={() => setShowCheckoutModal(false)}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative animate-scale-in"
            >
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                aria-label="Cerrar modal"
                className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <i className="bi bi-x-lg text-sm" aria-hidden="true"></i>
              </button>
              <h3 id="modal-title" className="text-xl font-black text-gray-900 dark:text-white mb-1.5">
                Datos de Contacto
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-5 font-medium">
                Ingresa tu nombre y WhatsApp para asociar el código de seguimiento de tu importación.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  processOrder(anonNombre, anonTelefono);
                }}
                className="space-y-4"
                noValidate
              >
                <div>
                  <label htmlFor="anonNombre" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                    Nombre completo
                  </label>
                  <input
                    id="anonNombre"
                    type="text"
                    autoComplete="name"
                    required
                    value={anonNombre}
                    onChange={(e) => setAnonNombre(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 text-sm font-medium"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>
                <div>
                  <label htmlFor="anonTelefono" className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                    WhatsApp
                  </label>
                  <input
                    id="anonTelefono"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={anonTelefono}
                    onChange={(e) => setAnonTelefono(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 text-sm font-medium tabular-nums"
                    placeholder="Ej. +58 412 1234567"
                  />
                </div>

                {checkoutError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs font-bold" role="alert">
                    {checkoutError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-2"
                >
                  {submitting ? 'Procesando...' : 'Generar Orden y Abrir WhatsApp'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
