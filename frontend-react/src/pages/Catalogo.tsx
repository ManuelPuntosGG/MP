import React, { useState, useEffect, useMemo } from 'react';
import api from '../api/axios';
import { useCart, CartItem } from '../context/CartContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Carrito from './Carrito';

export interface Categoria {
  id: number;
  nombre: string;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: string | number;
  categoria_id: number;
  categoria__nombre?: string;
  imagen?: string;
  stock: number;
}

export default function Catalogo() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [tasaVes, setTasaVes] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Filtros y vista
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('default'); // 'default', 'price-asc', 'price-desc'
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); 

  // Paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  const { addToCart, totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Sincronizar modal del carrito con la URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'carrito') {
      setIsCartOpen(true);
    } else {
      setIsCartOpen(false);
    }
  }, [location.search]);

  const handleCartOpen = (open: boolean) => {
    setIsCartOpen(open);
    if (open) {
      navigate('?tab=carrito', { replace: true });
    } else {
      navigate('?tab=productos', { replace: true });
    }
  };

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

  const handleBuyNow = (producto: Producto) => {
    addToCart(producto);
    navigate('?tab=carrito');
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
      result.sort((a, b) => parseFloat(a.precio.toString()) - parseFloat(b.precio.toString()));
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => parseFloat(b.precio.toString()) - parseFloat(a.precio.toString()));
    }

    return result;
  }, [productos, searchQuery, activeCategory, sortBy]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(processedProducts.length / itemsPerPage));
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600" aria-label="Cargando catálogo"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-primary-100 dark:selection:bg-primary-950/30 selection:text-primary-900 dark:selection:text-primary-400 transition-colors duration-200">

      {/* Background glow just for Dark Mode */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-[500px] bg-primary-600/10 dark:bg-primary-600/15 blur-[120px] rounded-full pointer-events-none" aria-hidden="true" />

      <div className="relative max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">

        {/* Cabecera y Tasa */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white text-center md:text-left">
            Tienda Virtual
          </h1>
          {tasaVes && (
            <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 font-medium text-sm border border-primary-100 dark:border-primary-900/50 shadow-sm transition-colors duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 mr-2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tasa del día: {parseFloat(tasaVes).toFixed(2)} Bs/USD
            </div>
          )}
        </div>


        {/* Barra de Filtros Minimalista */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-2 sm:p-4 mb-8 shadow-sm hover:shadow-md dark:shadow-black/20 transition-all duration-200">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="relative w-full md:flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                aria-label="Buscar producto"
                placeholder="Buscar artículo (ej: CPU, Laptop)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl py-3 pl-12 pr-4 text-gray-900 dark:text-white placeholder-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-500 focus:bg-white dark:focus:bg-gray-950 transition-all duration-200"
              />
            </div>

            <div className="w-full md:w-auto">
              <select
                aria-label="Filtrar por categoría"
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl py-3 px-4 text-gray-700 dark:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 dark:focus:border-primary-500 focus:bg-white dark:focus:bg-gray-950 transition-all duration-200 cursor-pointer font-semibold"
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
                className="w-full md:w-auto px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-all duration-200 whitespace-nowrap text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Toolbar de Vistas y Orden */}
        {processedProducts.length > 0 && (
          <div className="flex flex-row justify-between items-center mb-8 gap-4 bg-white dark:bg-gray-900 p-2 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-200">
            {/* Filtros de Ordenamiento */}
            <div className="flex space-x-1 flex-wrap" role="group" aria-label="Opciones de ordenamiento">
              <button
                onClick={() => setSortBy('default')}
                aria-pressed={sortBy === 'default'}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${sortBy === 'default' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                Por defecto
              </button>
              <button
                onClick={() => setSortBy(sortBy === 'price-asc' ? 'price-desc' : 'price-asc')}
                aria-pressed={sortBy === 'price-asc' || sortBy === 'price-desc'}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${sortBy === 'price-asc' || sortBy === 'price-desc' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <span>Precio</span> {sortBy === 'price-desc' ? <span className="text-xs font-black">↓</span> : <span className="text-xs font-black">↑</span>}
              </button>
            </div>

            {/* Alternar Vistas */}
            <div className="flex bg-gray-50 dark:bg-gray-950 p-1 rounded-lg border border-gray-200 dark:border-gray-800 transition-colors duration-200 shrink-0" role="group" aria-label="Modo de visualización">
              <button
                onClick={() => setViewMode('grid')}
                aria-pressed={viewMode === 'grid'}
                className={`p-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${viewMode === 'grid' ? 'bg-white dark:bg-gray-800 shadow-sm text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                title="Vista Cuadrícula"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                className={`p-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${viewMode === 'list' ? 'bg-white dark:bg-gray-800 shadow-sm text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                title="Vista Lista"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"></path></svg>
              </button>
            </div>
          </div>
        )}

        {/* Listado de Productos */}
        {paginatedProducts.length > 0 ? (
          <div className={viewMode === 'grid'
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            : "flex flex-col space-y-4"
          }>
            {paginatedProducts.map((producto, index) => {
              const precioFloat = parseFloat(producto.precio.toString());
              const precioVes = tasaVes ? (precioFloat * parseFloat(tasaVes)).toFixed(2) : '0.00';
              const agotado = producto.stock === 0;

              return (
                <div
                  key={producto.id}
                  style={{ animationDelay: `${(index % 12) * 40}ms` }}
                  className={`group bg-white dark:bg-gray-900 rounded-3xl transition-all duration-300 border border-gray-100 dark:border-gray-800/60 animate-scale-in overflow-hidden
                    hover:-translate-y-1 hover:shadow-[0_20px_40px_-12px_rgba(225,29,72,0.15)] dark:hover:shadow-[0_20px_40px_-12px_rgba(225,29,72,0.25)] hover:border-primary-200 dark:hover:border-primary-900/50
                    ${viewMode === 'list' ? 'flex flex-col sm:flex-row p-4 gap-6 items-center' : 'flex flex-col'}
                    ${agotado ? 'opacity-75 grayscale-[0.3]' : ''}
                  `}
                >
                  {/* Contenedor de Imagen */}
                  <div className={`relative overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-300
                    ${viewMode === 'list' 
                      ? 'w-full sm:w-56 aspect-square rounded-2xl flex-shrink-0' 
                      : 'w-full aspect-square'
                    }`}
                  >
                    {producto.imagen ? (
                      <img
                        src={producto.imagen}
                        alt={`Fotografía de ${producto.nombre}`}
                        className="object-contain w-full h-full transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-700">
                        <span className="text-5xl mb-2" aria-hidden="true">🔧</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Sin imagen</span>
                      </div>
                    )}

                    {viewMode === 'grid' && (
                      <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-white/10 via-transparent to-transparent dark:from-gray-900/10 pointer-events-none" aria-hidden="true" />
                    )}

                    {/* Badge Agotado */}
                    {agotado && (
                      <div className="absolute top-4 right-4 backdrop-blur-md bg-gray-900/80 border border-white/10 dark:border-gray-800 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md z-10">
                        Agotado
                      </div>
                    )}
                  </div>

                  {/* Bloque de Información */}
                  <div className={`flex flex-col flex-1 w-full ${viewMode === 'grid' ? 'p-5 pt-4' : 'py-2'}`}>
                    <div className="mb-3">
                      <span className="text-primary-600 dark:text-primary-400 text-[10px] font-bold uppercase tracking-widest block mb-1">
                        {producto.categoria__nombre || 'General'}
                      </span>
                      <h3 
                        className={`font-bold text-gray-900 dark:text-white leading-tight tracking-tight hover:text-primary-600 dark:hover:text-primary-400 transition-colors
                          ${viewMode === 'list' ? 'text-2xl mb-2 font-black' : 'text-base line-clamp-1 font-bold'}`} 
                        title={producto.nombre}
                      >
                        {producto.nombre}
                      </h3>

                      {viewMode === 'list' && (
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed font-medium">
                          {producto.descripcion}
                        </p>
                      )}
                    </div>

                    {/* Precios y Botones */}
                    <div className={`flex gap-4 mt-auto pt-3 border-t border-gray-50 dark:border-gray-800/40
                      ${viewMode === 'grid' ? 'flex-col items-stretch' : 'items-center justify-between'}`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                          ${precioFloat.toFixed(2)}
                        </span>
                        {tasaVes && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap">
                            ≈ {precioVes} Bs.
                          </span>
                        )}
                      </div>

                      <div className={`flex gap-2 ${viewMode === 'grid' ? 'w-full' : 'w-full sm:w-auto'}`}>
                        <button
                          onClick={() => addToCart(producto)}
                          disabled={agotado}
                          aria-label={`Añadir ${producto.nombre} al carrito`}
                          className={`flex-1 justify-center rounded-xl flex items-center font-bold transition-all duration-200 whitespace-nowrap h-11 px-4 text-xs sm:text-sm gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
                            ${agotado
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                              : 'bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 hover:bg-primary-600 hover:text-white dark:hover:bg-primary-600 hover:shadow-md hover:shadow-primary-500/20 active:scale-95'
                            }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          <span>Añadir</span>
                        </button>

                        <button
                          onClick={() => handleBuyNow(producto)}
                          disabled={agotado}
                          aria-label={`Comprar ${producto.nombre} ahora`}
                          className={`flex-1 justify-center rounded-xl flex items-center font-bold transition-all duration-200 text-xs sm:text-sm h-11 px-4 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-gray-900
                            ${agotado
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                              : 'bg-primary-600 hover:bg-primary-500 text-white shadow-md shadow-primary-600/20 hover:shadow-primary-500/50 hover:scale-[1.02] active:scale-95'
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
          <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors duration-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-950 mb-4 transition-colors duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-gray-400" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No se encontraron productos</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm">Ajusta los parámetros de búsqueda o limpia los filtros para ver el catálogo completo.</p>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="mt-12 flex justify-center">
            <nav className="flex items-center space-x-2" aria-label="Navegación de páginas">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Página anterior"
                className="p-2 rounded-xl bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-800 transition-colors duration-200 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
              </button>

              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  aria-label={`Ir a la página ${i + 1}`}
                  aria-current={currentPage === i + 1 ? 'page' : undefined}
                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-all duration-200 shadow-sm border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary-500 ${currentPage === i + 1 ? 'bg-primary-600 border-primary-600 text-white shadow-primary-200/50 dark:shadow-primary-900/30' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Página siguiente"
                className="p-2 rounded-xl bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-800 transition-colors duration-200 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Botón Flotante del Carrito */}
      {!isCartOpen && totalItems > 0 && (
        <button
          type="button"
          onClick={() => handleCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 p-4 bg-primary-600 hover:bg-primary-500 text-white rounded-full shadow-lg shadow-primary-600/30 hover:shadow-primary-600/50 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center animate-scale-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
          title="Ver Carrito de Compras"
          aria-label={`Ver carrito con ${totalItems} artículos`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-gray-900 border border-white dark:border-gray-900 rounded-full">
            {totalItems}
          </span>
        </button>
      )}

      {/* Modal del Carrito */}
      {isCartOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300"
          role="dialog"
          aria-modal="true"
          aria-label="Carrito de compras"
        >
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-3xl max-w-5xl w-full shadow-2xl relative animate-scale-in max-h-[90vh] overflow-y-auto p-2 sm:p-6 transition-colors duration-200">
            
            {/* Botón de Cerrar */}
            <button
              type="button"
              onClick={() => handleCartOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              title="Cerrar Carrito"
              aria-label="Cerrar modal del carrito"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <Carrito onBackToCatalog={() => handleCartOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
