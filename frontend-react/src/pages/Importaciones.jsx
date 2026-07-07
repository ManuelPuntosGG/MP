import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const TARIFA_LIBRA = 9.00;
const COMISION_MINIMA = 5.00;
const STORAGE_KEY = 'mptech_import_cart';
const TELEFONO_WHATSAPP = "584245022292";

export default function Importaciones() {
  const { user } = useAuth();
  const [items, setItems] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [tasaVes, setTasaVes] = useState(null);
  const [loadingTasa, setLoadingTasa] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successCode, setSuccessCode] = useState(null);

  // Form Inputs
  const [url, setUrl] = useState('');
  const [precio, setPrecio] = useState('');
  const [peso, setPeso] = useState('1');

  // Checkout inputs for anonymous users
  const [anonNombre, setAnonNombre] = useState('');
  const [anonTelefono, setAnonTelefono] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  useEffect(() => {
    const fetchTasa = async () => {
      try {
        const response = await api.get('/tasa/');
        setTasaVes(response.data.tasa_ves);
      } catch (err) {
        console.error('Error fetching rate:', err);
      } finally {
        setLoadingTasa(false);
      }
    };
    fetchTasa();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const detectarTienda = (productUrl) => {
    const urlLower = productUrl.toLowerCase();
    if (urlLower.includes("amazon")) return "Amazon";
    if (urlLower.includes("aliexpress")) return "AliExpress";
    if (urlLower.includes("ebay")) return "eBay";
    return "Otro";
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    const precioFloat = parseFloat(precio) || 0;
    const pesoInt = parseInt(peso, 10) || 1;

    if (precioFloat <= 0 || pesoInt <= 0) return;

    const newItem = {
      id: Date.now(),
      tienda: detectarTienda(url),
      url: url.trim(),
      precio: precioFloat,
      peso: pesoInt
    };

    setItems([...items, newItem]);
    setUrl('');
    setPrecio('');
    setPeso('1');
  };

  const handleModifyItem = (id, field, value) => {
    setItems(prevItems => prevItems.map(item => {
      if (item.id === id) {
        let numVal = field === 'peso' ? (parseInt(value, 10) || 1) : (parseFloat(value) || 0.01);
        if (numVal <= 0) numVal = field === 'peso' ? 1 : 0.01;
        return { ...item, [field]: numVal };
      }
      return item;
    }));
  };

  const handleRemoveItem = (id) => {
    setItems(prevItems => prevItems.filter(item => item.id !== id));
  };

  const handleClearList = () => {
    if (items.length === 0) return;
    if (window.confirm('¿Estás seguro de limpiar toda la lista de cotización?')) {
      setItems([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Cálculos de Totales
  const totals = useMemo(() => {
    const totalFob = items.reduce((sum, item) => sum + item.precio, 0);
    const totalFlete = items.reduce((sum, item) => sum + (item.peso * TARIFA_LIBRA), 0);
    
    let porcentajeComision = 0.10;
    if (totalFob >= 200 && totalFob <= 1000) {
      porcentajeComision = 0.075;
    } else if (totalFob > 1000) {
      porcentajeComision = 0.05;
    }

    const totalComision = items.length > 0 
      ? Math.max(totalFob * porcentajeComision, COMISION_MINIMA)
      : 0;

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
      inicialBs: tasaVes ? inicial50 * parseFloat(tasaVes) : 0
    };
  }, [items, tasaVes]);

  const triggerCheckout = (e) => {
    e.preventDefault();
    if (items.length === 0) return;
    
    if (user) {
      processOrder(user.nombre_completo || user.email, user.telefono || '');
    } else {
      setShowCheckoutModal(true);
    }
  };

  const processOrder = async (nombre, telefono) => {
    setSubmitting(true);
    
    // 1. Enviar datos de registro a Django
    try {
      const response = await api.post('/guardar-importacion/', {
        productos: items,
        total_usd: totals.totalUsd,
        total_ves: totals.totalBs,
        nombre: nombre,
        telefono: telefono
      });

      if (response.data.success) {
        setSuccessCode(response.data.codigo);
        // 2. Formular mensaje de WhatsApp
        sendWhatsAppMessage(nombre, telefono);
        setItems([]);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Error al registrar la cotización en el servidor.');
    } finally {
      setSubmitting(false);
      setShowCheckoutModal(false);
    }
  };

  const sendWhatsAppMessage = (nombre, telefono) => {
    const rateVal = tasaVes ? parseFloat(tasaVes) : 0;
    
    let messageLines = [
      "¡Hola *MP Tech*!",
      "",
      "Me gustaría solicitar la cotización formal e importación de los siguientes artículos:",
      ""
    ];

    items.forEach((item, i) => {
      const itemPrecioBs = rateVal ? item.precio * rateVal : 0;
      messageLines.push(`📦 *Artículo #${i+1}* (${item.tienda})`);
      messageLines.push(`🔗 *Link:* ${item.url}`);
      messageLines.push(`💵 *Precio:* $${item.precio.toFixed(2)} (~${itemPrecioBs.toFixed(2)} Bs) | ⚖️ *Peso:* ${item.peso.toFixed(1)} Lbs`);
      messageLines.push("");
    });

    messageLines.push("----------------------------------");
    messageLines.push("📊 *DESGLOSE ESTIMADO DEL PEDIDO:*");
    messageLines.push(`🔹 *Valor total productos:* $${totals.fobUsd.toFixed(2)} (${totals.fobBs.toFixed(2)} Bs)`);
    messageLines.push(`🔹 *Flete aéreo consolidado:* $${totals.fleteUsd.toFixed(2)} (${totals.fleteBs.toFixed(2)} Bs)`);
    messageLines.push(`🔹 *Gestión y seguro corporativo (${(totals.porcentajeComision * 100).toFixed(1)}%):* $${totals.comisionUsd.toFixed(2)} (${totals.comisionBs.toFixed(2)} Bs)`);
    messageLines.push(`💰 *TOTAL GENERAL ESTIMADO:* *$${totals.totalUsd.toFixed(2)}* (*${totals.totalBs.toFixed(2)} Bs*)`);
    messageLines.push("");
    messageLines.push(`💵 *Abono inicial (50% para comprar):* $${totals.inicialUsd.toFixed(2)} (*${totals.inicialBs.toFixed(2)} Bs*)`);
    messageLines.push(`💵 *Monto al retirar (50% restante):* $${totals.inicialUsd.toFixed(2)} (*${totals.inicialBs.toFixed(2)} Bs*)`);
    messageLines.push("");
    if (rateVal) {
      messageLines.push(`📈 _Tarifa de cálculo aplicada: ${rateVal.toFixed(2)} Bs/$_`);
      messageLines.push("");
    }
    messageLines.push("⚠️ _Acepto que los valores son estimados y la cotización final puede variar de acuerdo al pesaje y cubicaje definitivo medido en el almacén de origen._");
    
    if (nombre && telefono) {
      messageLines.push("");
      messageLines.push(`👤 *Nombre:* ${nombre}`);
      messageLines.push(`📞 *Teléfono:* ${telefono}`);
    }

    const encodedMessage = encodeURIComponent(messageLines.join("\n"));
    window.open(`https://wa.me/${TELEFONO_WHATSAPP}?text=${encodedMessage}`, '_blank');
  };

  if (successCode) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 bg-gray-50/50 dark:bg-gray-950/20">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-8 text-center shadow-xl shadow-rose-100/50 dark:shadow-black/25 hover:shadow-rose-200/50 dark:hover:border-rose-900/40 transition-all duration-300">
          <div className="w-20 h-20 bg-green-50 dark:bg-green-950/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-100 dark:border-green-900/50">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-4">¡Cotización Registrada!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Tu código de seguimiento de importación es:</p>
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 py-4 px-6 rounded-2xl mb-8">
            <span className="text-3xl font-mono font-black tracking-widest text-rose-600 dark:text-rose-450">{successCode}</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
            Hemos abierto una pestaña de WhatsApp para que envíes el desglose a nuestro agente logístico y concretar tu pedido.
          </p>
          <button 
            onClick={() => setSuccessCode(null)}
            className="block w-full py-4 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:bg-rose-600 dark:hover:bg-rose-600 dark:hover:text-white transition-colors shadow-md"
          >
            Nueva Cotización
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 bg-gray-50/50 dark:bg-gray-950/20 transition-colors duration-300">
      
      {/* Cabecera y Tasa */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white">
            Importaciones Directas
          </h1>
          <p className="text-gray-505 dark:text-gray-400 text-sm mt-2">
            Cotiza el costo total de traer tus productos de Amazon, AliExpress o eBay hasta tu puerta en Venezuela.
          </p>
        </div>
        {tasaVes && (
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 font-medium text-sm border border-rose-100 dark:border-rose-900/50 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Tasa del día: {parseFloat(tasaVes).toFixed(2)} Bs/$
          </div>
        )}
      </div>

      {/* Formulario Adicionar Artículo */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-sm mb-8 transition-colors duration-300">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Añadir artículo a cotización</h2>
        <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          
          <div className="md:col-span-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Enlace del producto</label>
            <input
              type="url"
              required
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:focus:border-rose-500 focus:bg-white outline-none transition-all text-sm"
              placeholder="https://www.amazon.com/dp/..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Precio Tienda ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={precio}
              onChange={e => setPrecio(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:focus:border-rose-500 focus:bg-white outline-none transition-all text-sm"
              placeholder="0.00"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Peso Est. (Lbs)</label>
            <input
              type="number"
              step="1"
              min="1"
              required
              value={peso}
              onChange={e => setPeso(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:focus:border-rose-500 focus:bg-white outline-none transition-all text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full bg-gray-900 dark:bg-white hover:bg-rose-650 dark:hover:bg-rose-600 text-white dark:text-gray-900 dark:hover:text-white font-bold py-3.5 px-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Añadir
            </button>
          </div>

        </form>
      </div>

      {/* Tabla de Artículos */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm mb-8 transition-colors duration-300">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Artículos Cotizados ({items.length})</h2>
          {items.length > 0 && (
            <button
              onClick={handleClearList}
              className="text-sm font-bold text-rose-600 hover:text-rose-700 transition-colors flex items-center gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Limpiar Lista
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-950/45 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                <th className="px-6 py-4">Tienda</th>
                <th className="px-6 py-4">Enlace</th>
                <th className="px-6 py-4 text-center">Precio ($)</th>
                <th className="px-6 py-4 text-center">Peso (Lbs)</th>
                <th className="px-6 py-4">Flete Estimado</th>
                <th className="px-6 py-4 text-center w-16">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-16 text-center text-gray-500 dark:text-gray-400">
                    <span className="text-4xl mb-3 block">📦</span>
                    No has añadido ningún producto a tu lista de cotización todavía.
                  </td>
                </tr>
              ) : (
                items.map(item => {
                  const flete = item.peso * TARIFA_LIBRA;
                  const fleteBs = tasaVes ? flete * parseFloat(tasaVes) : 0;
                  
                  return (
                    <tr key={item.id} className="border-b border-gray-100 dark:border-gray-800/60 hover:bg-gray-50/40 dark:hover:bg-gray-950/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider
                          ${item.tienda === 'Amazon' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40' : ''}
                          ${item.tienda === 'AliExpress' ? 'bg-orange-100 text-orange-850 dark:bg-orange-950/30 dark:text-orange-400 border border-orange-200 dark:border-orange-900/40' : ''}
                          ${item.tienda === 'eBay' ? 'bg-blue-105 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40' : ''}
                          ${item.tienda === 'Otro' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700' : ''}
                        `}>
                          {item.tienda}
                        </span>
                      </td>
                      <td className="px-6 py-4 max-w-[200px] truncate">
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1">
                          Ver Artículo
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="number"
                          step="0.01"
                          value={item.precio}
                          onChange={e => handleModifyItem(item.id, 'precio', e.target.value)}
                          className="w-20 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg py-1.5 px-2 text-center text-sm font-bold text-gray-900 dark:text-white"
                        />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="number"
                          step="1"
                          value={item.peso}
                          onChange={e => handleModifyItem(item.id, 'peso', e.target.value)}
                          className="w-16 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg py-1.5 px-2 text-center text-sm font-bold text-gray-900 dark:text-white"
                        />
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="font-bold text-gray-900 dark:text-white">${flete.toFixed(2)}</span>
                        {tasaVes && (
                          <span className="block text-xs text-gray-500 font-medium mt-0.5">≈ {fleteBs.toFixed(2)} Bs</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-rose-600 hover:text-rose-700 p-1.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-lg transition-colors"
                          title="Eliminar artículo"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Políticas */}
      <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.25)] hover:border-rose-100 dark:hover:border-rose-900/50 transition-all duration-300 flex items-start gap-4 mb-8">
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-2xl flex-shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div>
          <strong className="text-gray-900 dark:text-white font-black block mb-2">Condiciones generales de cotización logística:</strong>
          <ul className="list-disc pl-4 space-y-1.5 text-sm text-gray-550 dark:text-gray-400 font-medium">
            <li><strong>Comisión de gestión variable:</strong> Minimizas costos a mayor volumen de compra. Aplicamos de forma automática 10% (&lt; $200), 7.5% (entre $200 y $1000) y apenas 5% para presupuestos superiores a $1000.</li>
            <li><strong>Cálculo definitivo:</strong> El costo final del flete aéreo se ajustará de acuerdo con las medidas (volumen) y el peso neto real del paquete medido en nuestro almacén receptor de Miami.</li>
          </ul>
        </div>
      </div>

      {/* Resumen Estimado */}
      {items.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 sm:p-10 shadow-sm hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_15px_40px_-10px_rgba(225,29,72,0.25)] hover:border-rose-100 dark:hover:border-rose-900/50 transition-all duration-300">
          <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6">Resumen Estimado de Importación</h3>
          
          <div className="space-y-4 border-b border-gray-100 dark:border-gray-800 pb-6 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Total Mercancía (Valor FOB):</span>
              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white">${totals.fobUsd.toFixed(2)}</p>
                {tasaVes && <p className="text-xs text-gray-400 mt-0.5">≈ {totals.fobBs.toFixed(2)} Bs</p>}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Flete Aéreo Logístico Consolidado:</span>
              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white">${totals.fleteUsd.toFixed(2)}</p>
                {tasaVes && <p className="text-xs text-gray-400 mt-0.5">≈ {totals.fleteBs.toFixed(2)} Bs</p>}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500 dark:text-gray-400 font-medium">
                Gestión Administrativa y Seguro Operativo ({(totals.porcentajeComision * 100).toFixed(1)}%):
              </span>
              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white">${totals.comisionUsd.toFixed(2)}</p>
                {tasaVes && <p className="text-xs text-gray-400 mt-0.5">≈ {totals.comisionBs.toFixed(2)} Bs</p>}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <span className="text-lg font-bold text-gray-900 dark:text-white">Total General Estimado:</span>
            <div className="text-right">
              <p className="text-2xl font-black text-rose-600 dark:text-rose-500">${totals.totalUsd.toFixed(2)}</p>
              {tasaVes && <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mt-0.5">≈ {totals.totalBs.toFixed(2)} Bs</p>}
            </div>
          </div>

          <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/40 rounded-2xl p-4 text-center text-sm font-bold text-rose-700 dark:text-rose-400 mb-8 leading-relaxed">
            📌 Financiamiento: Inicial 50% <span className="underline">${totals.inicialUsd.toFixed(2)} ({totals.inicialBs.toFixed(2)} Bs)</span> · Saldo contra entrega <span className="underline">${totals.inicialUsd.toFixed(2)} ({totals.inicialBs.toFixed(2)} Bs)</span>
          </div>

          <button
            onClick={triggerCheckout}
            disabled={submitting}
            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-rose-600/35 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.01 2.019c-5.522 0-10 4.478-10 10c0 1.767.462 3.427 1.267 4.887l-1.277 4.662c-.104.382.26.732.637.611l4.524-1.44c1.402.735 2.99 1.157 4.673 1.157 5.523 0 10-4.477 10-10c0-5.523-4.477-10-10-10zm4.743 14.281c-.247.697-1.229 1.282-1.696 1.336-.452.053-1.04.148-3.037-.674-2.55-1.053-4.178-3.649-4.305-3.818-.127-.168-1.031-1.371-1.031-2.617 0-1.246.647-1.859.88-2.106.233-.247.509-.307.679-.307.17 0 .34.004.488.01.152.006.357-.059.559.432.204.498.7 1.708.761 1.832.062.124.103.268.02.433-.082.165-.124.268-.247.411-.124.143-.261.321-.373.432-.124.124-.254.26-.109.509.145.247.643 1.059 1.379 1.714.949.846 1.748 1.109 1.996 1.233.248.124.391.103.535-.062.144-.165.619-.721.784-.969.165-.247.33-.206.559-.124.229.082 1.458.687 1.709.813.25.126.417.187.479.293.061.106.061.616-.186 1.313z" /></svg>
            Solicitar Cotización por WhatsApp
          </button>
        </div>
      )}

      {/* Checkout Modal for Anonymous Users */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
            <button 
              onClick={() => setShowCheckoutModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Completar Datos</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Por favor ingresa tu nombre y número de contacto para asociar la cotización.</p>
            <form onSubmit={(e) => { e.preventDefault(); processOrder(anonNombre, anonTelefono); }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Nombre completo</label>
                <input
                  type="text"
                  required
                  value={anonNombre}
                  onChange={e => setAnonNombre(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all text-sm font-semibold"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">WhatsApp</label>
                <input
                  type="tel"
                  required
                  value={anonTelefono}
                  onChange={e => setAnonTelefono(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none transition-all text-sm font-semibold"
                  placeholder="Ej. +584121234567"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all shadow-md shadow-rose-600/30 disabled:opacity-50"
              >
                {submitting ? 'Procesando...' : 'Enviar y abrir WhatsApp'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
