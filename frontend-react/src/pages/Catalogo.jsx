import { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

export default function Catalogo() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [tasaVes, setTasaVes] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtros y vista
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [sortBy, setSortBy] = useState('default'); // 'default', 'price-asc', 'price-desc'
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list'

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const { addToCart } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        const [prodRes, catRes, tasaRes] = await Promise.all([
          api.get('/productos/'),
          api.get('/categorias/'),
          api.get('/tasa/')
        ]);
        setProductos(prodRes.data);
        setCategorias(catRes.data);
        setTasaVes(tasaRes.data.tasa_ves);
      } catch (error) {
        console.error('Error cargando el catálogo:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDatos();
  }, []);

  const handleBuyNow = (producto) => {
    addToCart(producto);
    navigate('/carrito');
  };

  // Filtrado y Ordenamiento
  const processedProducts = useMemo(() => {
    let result = [...productos];

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.nombre.toLowerCase().includes(lowerQuery) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(lowerQuery))
      );
    }

    if (activeCategory) {
      result = result.filter(p => p.categoria_id.toString() === activeCategory.toString());
    }

    if (sortBy === 'price-asc') {
      result.sort((a, b) => parseFloat(a.precio) - parseFloat(b.precio));
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => parseFloat(b.precio) - parseFloat(a.precio));
    }

    return result;
  }, [productos, searchQuery, activeCategory, sortBy]);

  // Paginación
  const totalPages = Math.ceil(processedProducts.length / itemsPerPage);
  const paginatedProducts = processedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory, sortBy]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-gray-50/50 dark:bg-gray-950/20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-rose-100 dark:selection:bg-rose-950/30 selection:text-rose-900 dark:selection:text-rose-450 transition-colors duration-300">

      {/* Background glow just for Dark Mode */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[500px] bg-rose-600/10 dark:bg-rose-600/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">

        {/* Cabecera y Tasa */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0" align="center">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white">
            Tienda Virtual
          </h1>
          {tasaVes && (
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 font-medium text-sm border border-rose-100 dark:border-rose-900/50 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tasa del día: {parseFloat(tasaVes).toFixed(2)} Bs/USD
            </div>
          )}
        </div>

        {/* Barra de Filtros Minimalista */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-2 sm:p-4 mb-8 shadow-sm hover:shadow-md dark:shadow-black/20 transition-all duration-300">
          <div className="flex flex-col md:flex-row gap-3 items-center">

            <div className="relative w-full md:flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Buscar artículo (ej: CPU, Laptop)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl py-3 pl-12 pr-4 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:focus:border-rose-500 focus:bg-white dark:focus:bg-gray-950 transition-all outline-none"
              />
            </div>

            <div className="w-full md:w-auto">
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl py-3 px-4 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 dark:focus:border-rose-500 focus:bg-white dark:focus:bg-gray-950 transition-all outline-none cursor-pointer"
              >
                <option value="">Todas las categorías</option>
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>

            {(searchQuery || activeCategory) && (
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory(''); setSortBy('default'); }}
                className="w-full md:w-auto px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all whitespace-nowrap"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Toolbar de Vistas y Orden */}
        {processedProducts.length > 0 && (
          <div className="flex flex-row justify-between items-center mb-8 gap-4 bg-white dark:bg-gray-900 p-2 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-300">

            {/* Filtros de Ordenamiento */}
            <div className="flex space-x-1 flex-wrap">
              <button
                onClick={() => setSortBy('default')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sortBy === 'default' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                Por defecto
              </button>
              <button
                onClick={() => setSortBy('price-asc')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${sortBy === 'price-asc' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <span>Precio</span> <span className="text-xs">↑</span>
              </button>
              <button
                onClick={() => setSortBy('price-desc')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${sortBy === 'price-desc' ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <span>Precio</span> <span className="text-xs">↓</span>
              </button>
            </div>

            {/* Alternar Vistas */}
            <div className="flex bg-gray-50 dark:bg-gray-950 p-1 rounded-lg border border-gray-200 dark:border-gray-800 transition-colors duration-300 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-gray-800 shadow-sm text-rose-600' : 'text-gray-400 dark:text-gray-505 hover:text-gray-900 dark:hover:text-white'}`}
                title="Vista Cuadrícula"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 shadow-sm text-rose-600' : 'text-gray-400 dark:text-gray-505 hover:text-gray-900 dark:hover:text-white'}`}
                title="Vista Lista"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"></path></svg>
              </button>
            </div>

          </div>
        )}

{/* Listado de Productos - Tarjetas de Alto Impacto Visual (Imágenes 1:1) */}
{paginatedProducts.length > 0 ? (
  <div className={viewMode === 'grid'
    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    : "flex flex-col space-y-4"
  }>
    {paginatedProducts.map((producto, index) => {
      const precioFloat = parseFloat(producto.precio);
      const precioVes = tasaVes ? (precioFloat * parseFloat(tasaVes)).toFixed(2) : '0.00';
      const agotado = producto.stock === 0;

      return (
        <div
          key={producto.id}
          style={{ animationDelay: `${(index % 12) * 50}ms` }}
          className={`group bg-white dark:bg-gray-900 rounded-3xl transition-all duration-500 border border-gray-100 dark:border-gray-800/60 animate-scale-in overflow-hidden
            hover:-translate-y-1.5 hover:shadow-[0_20px_50px_-12px_rgba(225,29,72,0.3)] dark:hover:shadow-[0_20px_50px_-12px_rgba(225,29,72,0.45)] hover:border-rose-200 dark:hover:border-rose-900/50
            ${viewMode === 'list' ? 'flex flex-col sm:flex-row p-4 gap-6 items-center' : 'flex flex-col'}
            ${agotado ? 'opacity-75 grayscale-[0.2]' : ''}
          `}
        >
          {/* Contenedor de Imagen 1:1 - Máximo Protagonismo */}
          <div className={`relative overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-500
            ${viewMode === 'list' 
              ? 'w-full sm:w-56 aspect-square rounded-2xl flex-shrink-0' 
              : 'w-full aspect-square'
            }`}
          >
            {producto.imagen ? (
              <img
                src={producto.imagen}
                alt={producto.nombre}
                className="object-contain w-full h-full transition-transform duration-500 ease-out group-hover:scale-[1.03]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-700">
                <span className="text-5xl mb-2">🔧</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Sin imagen</span>
              </div>
            )}

            {/* Degradado sutil inferior en la imagen (solo Grid) */}
            {viewMode === 'grid' && (
              <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-white/20 via-transparent to-transparent dark:from-gray-900/10 pointer-events-none" />
            )}

            {/* Badge Agotado - Estilo Glassmorphic */}
            {agotado && (
              <div className="absolute top-4 right-4 backdrop-blur-md bg-gray-950/75 dark:bg-gray-900/80 border border-white/10 dark:border-gray-800 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md z-10">
                Agotado
              </div>
            )}
          </div>

          {/* Bloque de Información Integrado */}
          <div className={`flex flex-col flex-1 w-full ${viewMode === 'grid' ? 'p-5 pt-4' : 'py-2'}`}>
            <div className="mb-3">
              <span className="text-rose-600 dark:text-rose-500 text-[10px] font-bold uppercase tracking-widest block mb-1">
                {producto.categoria__nombre || 'General'}
              </span>
              <h3 
                className={`font-bold text-gray-900 dark:text-white leading-tight tracking-tight hover:text-rose-600 dark:hover:text-rose-400 transition-colors
                  ${viewMode === 'list' ? 'text-2xl mb-2' : 'text-base line-clamp-1'}`} 
                title={producto.nombre}
              >
                {producto.nombre}
              </h3>

              {viewMode === 'list' && (
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
                  {producto.descripcion}
                </p>
              )}
            </div>

            {/* Precios y Botones de Acción Modificados (Mismas Dimensiones) */}
            <div className={`flex gap-4 mt-auto pt-3 border-t border-gray-50 dark:border-gray-800/40
              ${viewMode === 'grid' ? 'flex-col items-stretch' : 'items-center justify-between'}`}
            >
              <div className="flex flex-col">
                <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                  ${precioFloat.toFixed(2)}
                </span>
                {tasaVes && (
                  <span className="text-xs text-gray-400 dark:text-gray-505 font-medium whitespace-nowrap">
                    ≈ {precioVes} Bs.
                  </span>
                )}
              </div>

              {/* Contenedor de botones simétricos */}
              <div className={`flex gap-2 ${viewMode === 'grid' ? 'w-full' : 'w-full sm:w-auto'}`}>
                <button
                  onClick={() => addToCart(producto)}
                  disabled={agotado}
                  className={`flex-1 justify-center rounded-xl flex items-center font-bold transition-all duration-300 whitespace-nowrap h-11 px-4 text-xs sm:text-sm gap-1.5
                    ${agotado
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                      : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 hover:shadow-md hover:shadow-rose-500/20'
                    }`}
                  title="Añadir al carrito"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span>Añadir</span>
                </button>

                <button
                  onClick={() => handleBuyNow(producto)}
                  disabled={agotado}
                  className={`flex-1 justify-center rounded-xl flex items-center font-bold transition-all duration-300 text-xs sm:text-sm h-11 px-4 whitespace-nowrap
                    ${agotado
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 shadow-md'
                    }`}
                >
                  Comprar
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    })}
  </div>
) : (
  <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-950 mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    </div>
    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No se encontraron productos</h3>
    <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">Ajusta los parámetros de búsqueda o limpia los filtros para ver el catálogo completo.</p>
  </div>
)}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="mt-12 flex justify-center">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-800 transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
              </button>

              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-all shadow-sm border ${currentPage === i + 1 ? 'bg-rose-600 border-rose-600 text-white shadow-rose-200' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-950 dark:hover:text-white'}`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:text-gray-905 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-800 transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </nav>
          </div>
        )}

      </div>
    </div>
  );
}
