import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api/axios';
import { useCart } from '../context/CartContext';
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
  const [justAddedId, setJustAddedId] = useState<number | null>(null);

  // Filtros y vista
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('default');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  const { cart, addToCart, totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  // Sincronizar modal del carrito con la URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    setIsCartOpen(tabParam === 'carrito');
  }, [location.search]);

  const handleCartOpen = useCallback(
    (open: boolean) => {
      setIsCartOpen(open);
      if (open) {
        navigate('?tab=carrito', { replace: true });
      } else {
        navigate('/catalogo', { replace: true });
      }
    },
    [navigate]
  );

  // Cerrar modal con Escape y bloquear scroll de fondo (fixing-accessibility)
  useEffect(() => {
    if (!isCartOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCartOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCartOpen, handleCartOpen]);

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        const [prodRes, catRes, tasaRes] = await Promise.all([
          api.get('/productos/'),
          api.get('/categorias/'),
          api.get('/tasa/'),
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

  const handleAddWithFeedback = (producto: Producto) => {
    addToCart(producto);
    setJustAddedId(producto.id);
    setTimeout(() => {
      setJustAddedId((prev) => (prev === producto.id ? null : prev));
    }, 1200);
  };

  const handleBuyNow = (producto: Producto) => {
    addToCart(producto);
    navigate('?tab=carrito');
  };

  // Filtrado y Ordenamiento
  const processedProducts = useMemo(() => {
    let result = [...productos];

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.nombre.toLowerCase().includes(lowerQuery) ||
          (p.descripcion && p.descripcion.toLowerCase().includes(lowerQuery))
      );
    }

    if (activeCategory) {
      result = result.filter((p) => p.categoria_id.toString() === activeCategory.toString());
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
      <div
        className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-fade-in"
        role="status"
        aria-live="polite"
        aria-label="Cargando catálogo de productos"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="space-y-2.5">
            <div className="h-9 w-56 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
            <div className="h-4 w-96 max-w-full bg-gray-200/70 dark:bg-gray-800/70 rounded-lg animate-pulse" />
          </div>
          <div className="h-9 w-48 bg-gray-200/80 dark:bg-gray-800 rounded-full animate-pulse" />
        </div>
        <div className="h-16 w-full bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800 rounded-2xl mb-8 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800 rounded-3xl overflow-hidden p-4 space-y-4 animate-pulse"
            >
              <div className="aspect-square w-full bg-gray-100 dark:bg-gray-800 rounded-2xl" />
              <div className="space-y-2">
                <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
              </div>
              <div className="h-10 w-full bg-gray-100 dark:bg-gray-800 rounded-xl" />
            </div>
          ))}
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
              Tienda <span className="text-primary-600 dark:text-primary-400">Virtual</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1.5 font-medium">
              Hardware, repuestos y equipos verificados con garantía de laboratorio.
            </p>
          </div>
          {tasaVes && (
            <div className="inline-flex items-center self-start md:self-auto px-3.5 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 font-bold text-xs border border-primary-100 dark:border-primary-900/50 tabular-nums">
              <i className="bi bi-currency-exchange mr-2" aria-hidden="true"></i>
              Tasa BCV (Euro): {parseFloat(tasaVes).toFixed(2)} Bs/$
            </div>
          )}
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-3 sm:p-4 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <i className="bi bi-search text-gray-400 dark:text-gray-500 text-sm" aria-hidden="true"></i>
              </div>
              <input
                type="search"
                aria-label="Buscar producto"
                placeholder="Buscar por nombre o especificación (ej. RTX, SSD, Ryzen)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 pl-10 pr-9 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 focus:bg-white dark:focus:bg-gray-950 transition-colors duration-150 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Borrar búsqueda"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <i className="bi bi-x-circle-fill text-sm" aria-hidden="true"></i>
                </button>
              )}
            </div>

            <div className="w-full md:w-56">
              <select
                aria-label="Filtrar por categoría"
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl py-2.5 px-3.5 text-sm text-gray-700 dark:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus:border-primary-500 transition-colors duration-150 cursor-pointer font-bold"
              >
                <option value="">Todas las categorías</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            {(searchQuery || activeCategory || sortBy !== 'default') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('');
                  setSortBy('default');
                }}
                className="w-full md:w-auto px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200/80 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors duration-150 whitespace-nowrap text-xs sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Toolbar de Vistas, Conteo y Orden */}
        {processedProducts.length > 0 && (
          <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tabular-nums">
              Mostrando <span className="text-gray-900 dark:text-white">{paginatedProducts.length}</span> de{' '}
              <span className="text-gray-900 dark:text-white">{processedProducts.length}</span> productos
            </p>

            <div className="flex items-center gap-2 ml-auto">
              {/* Filtros de Ordenamiento */}
              <div
                className="flex items-center bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-200/80 dark:border-gray-800"
                role="group"
                aria-label="Opciones de ordenamiento"
              >
                <button
                  type="button"
                  onClick={() => setSortBy('default')}
                  aria-pressed={sortBy === 'default'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                    sortBy === 'default'
                      ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Relevancia
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy(sortBy === 'price-asc' ? 'price-desc' : 'price-asc')}
                  aria-pressed={sortBy === 'price-desc' || sortBy === 'price-asc'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                    sortBy === 'price-desc' || sortBy === 'price-asc'
                      ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <span>Precio</span>
                  <span className="font-black" aria-hidden="true">
                    {sortBy === 'price-asc' ? '↑' : '↓'}
                  </span>
                </button>
              </div>

              {/* Alternar Vistas */}
              <div
                className="flex bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-200/80 dark:border-gray-800 shrink-0"
                role="group"
                aria-label="Modo de visualización"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  aria-pressed={viewMode === 'grid'}
                  className={`p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                    viewMode === 'grid'
                      ? 'bg-gray-100 dark:bg-gray-800 text-primary-600 dark:text-primary-400'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Vista Cuadrícula"
                  aria-label="Vista en cuadrícula"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                  className={`p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                    viewMode === 'list'
                      ? 'bg-gray-100 dark:bg-gray-800 text-primary-600 dark:text-primary-400'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  title="Vista Lista"
                  aria-label="Vista en lista"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Listado de Productos */}
        {paginatedProducts.length > 0 ? (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
                : 'flex flex-col space-y-3.5'
            }
          >
            {paginatedProducts.map((producto, index) => {
              const precioFloat = parseFloat(producto.precio.toString());
              const precioVes = tasaVes ? (precioFloat * parseFloat(tasaVes)).toFixed(2) : null;
              const agotado = producto.stock === 0;
              const itemInCart = cart.find((item) => item.producto_id === producto.id);
              const reachedMaxStock = itemInCart ? itemInCart.cantidad >= producto.stock : false;
              const disabledAction = agotado || reachedMaxStock;
              const isJustAdded = justAddedId === producto.id;

              return (
                <article
                  key={producto.id}
                  style={{ animationDelay: `${(index % 12) * 35}ms` }}
                  className={`group bg-white dark:bg-gray-900 rounded-3xl transition-[transform,border-color,box-shadow] duration-200 border border-gray-200/80 dark:border-gray-800 animate-scale-in overflow-hidden hover:border-primary-300 dark:hover:border-primary-800/80 hover:shadow-lg ${
                    viewMode === 'list' ? 'flex flex-col sm:flex-row p-4 gap-5 items-center' : 'flex flex-col p-3'
                  } ${agotado ? 'opacity-70' : ''}`}
                >
                  {/* Contenedor de Imagen con radio concéntrico (rounded-2xl dentro de rounded-3xl con p-3) */}
                  <div
                    className={`relative overflow-hidden bg-gray-50 dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800/60 ${
                      viewMode === 'list' ? 'w-full sm:w-48 aspect-square flex-shrink-0' : 'w-full aspect-square'
                    }`}
                  >
                    {producto.imagen ? (
                      <img
                        src={producto.imagen}
                        alt={producto.nombre}
                        loading="lazy"
                        className="object-contain w-full h-full p-3 transition-transform duration-300 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-700">
                        <i className="bi bi-cpu text-4xl mb-1.5" aria-hidden="true"></i>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-600">
                          Sin imagen
                        </span>
                      </div>
                    )}

                    {/* Badge Stock / Agotado */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      {agotado ? (
                        <span className="backdrop-blur-md bg-gray-900/85 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Agotado
                        </span>
                      ) : (
                        <span className="backdrop-blur-md bg-white/90 dark:bg-gray-900/90 border border-gray-200/70 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full tabular-nums">
                          Disponibles: {producto.stock}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bloque de Información */}
                  <div className={`flex flex-col flex-1 w-full ${viewMode === 'grid' ? 'pt-3.5 px-1.5 pb-1.5' : 'py-1'}`}>
                    <div className="mb-3">
                      <span className="text-primary-600 dark:text-primary-400 text-[11px] font-bold uppercase tracking-wider block mb-1">
                        {producto.categoria__nombre || 'Hardware'}
                      </span>
                      <h2
                        className={`font-bold text-gray-900 dark:text-white leading-snug tracking-tight ${
                          viewMode === 'list' ? 'text-xl mb-1.5 font-black' : 'text-sm sm:text-base line-clamp-2 min-h-[2.5rem]'
                        }`}
                        title={producto.nombre}
                      >
                        {producto.nombre}
                      </h2>

                      {viewMode === 'list' && producto.descripcion && (
                        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mb-3 line-clamp-2 leading-relaxed font-medium">
                          {producto.descripcion}
                        </p>
                      )}
                    </div>

                    {/* Precios y Botones */}
                    <div
                      className={`flex gap-3 mt-auto pt-3 border-t border-gray-100 dark:border-gray-800/70 ${
                        viewMode === 'grid' ? 'flex-col items-stretch' : 'flex-col sm:flex-row sm:items-center justify-between'
                      }`}
                    >
                      <div className="flex items-baseline justify-between sm:flex-col sm:items-start tabular-nums">
                        <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                          ${precioFloat.toFixed(2)}
                        </span>
                        {precioVes && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                            ≈ {precioVes} Bs
                          </span>
                        )}
                      </div>

                      <div className={`flex gap-2 ${viewMode === 'grid' ? 'w-full' : 'w-full sm:w-auto'}`}>
                        <button
                          type="button"
                          onClick={() => handleAddWithFeedback(producto)}
                          disabled={disabledAction}
                          aria-label={`Añadir ${producto.nombre} al carrito`}
                          className={`flex-1 justify-center rounded-xl flex items-center font-bold transition-colors duration-150 whitespace-nowrap h-10 px-3.5 text-xs gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                            isJustAdded
                              ? 'bg-emerald-600 text-white'
                              : disabledAction
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                              : 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-900/50 hover:bg-primary-600 hover:text-white dark:hover:bg-primary-600 dark:hover:text-white'
                          }`}
                        >
                          {isJustAdded ? (
                            <>
                              <i className="bi bi-check2 text-sm" aria-hidden="true"></i>
                              <span>Añadido</span>
                            </>
                          ) : reachedMaxStock ? (
                            <span>Máx. en carrito</span>
                          ) : (
                            <>
                              <i className="bi bi-cart-plus text-sm" aria-hidden="true"></i>
                              <span>Añadir</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleBuyNow(producto)}
                          disabled={disabledAction}
                          aria-label={`Comprar ${producto.nombre} ahora`}
                          className={`flex-1 justify-center rounded-xl flex items-center font-bold transition-colors duration-150 text-xs h-10 px-3.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 dark:focus-visible:ring-offset-gray-900 ${
                            disabledAction
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                              : 'bg-gray-900 hover:bg-primary-600 dark:bg-white dark:hover:bg-primary-500 text-white dark:text-gray-950 dark:hover:text-white'
                          }`}
                        >
                          Comprar
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/80 dark:border-gray-800 shadow-sm px-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4 text-gray-400">
              <i className="bi bi-search text-2xl" aria-hidden="true"></i>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5">
              No encontramos productos con esos criterios
            </h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-xs sm:text-sm mb-5">
              Prueba con otro término de búsqueda o restablece los filtros para explorar todo el inventario.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('');
                setSortBy('default');
              }}
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl text-xs sm:text-sm transition-colors"
            >
              Ver todo el catálogo
            </button>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="mt-10 flex justify-center">
            <nav className="flex items-center gap-1.5 tabular-nums" aria-label="Navegación de páginas">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Página anterior"
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <i className="bi bi-chevron-left text-sm" aria-hidden="true"></i>
              </button>

              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentPage(i + 1)}
                  aria-label={`Ir a la página ${i + 1}`}
                  aria-current={currentPage === i + 1 ? 'page' : undefined}
                  className={`w-10 h-10 rounded-xl text-xs font-bold transition-colors border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                    currentPage === i + 1
                      ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Página siguiente"
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-200 dark:border-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <i className="bi bi-chevron-right text-sm" aria-hidden="true"></i>
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
          className="fixed bottom-6 right-6 z-40 px-5 py-3.5 bg-primary-600 hover:bg-primary-500 text-white rounded-full shadow-lg shadow-primary-600/30 transition-[transform,background-color] duration-150 active:scale-95 flex items-center gap-2.5 animate-scale-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 tabular-nums"
          title="Ver Carrito de Compras"
          aria-label={`Ver carrito con ${totalItems} artículos`}
        >
          <i className="bi bi-cart3 text-lg" aria-hidden="true"></i>
          <span className="text-xs font-black">Ver Carrito</span>
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-black bg-white text-primary-600 rounded-full">
            {totalItems}
          </span>
        </button>
      )}

      {/* Modal del Carrito con soporte de clic exterior y Escape */}
      {isCartOpen && (
        <div
          onClick={() => handleCartOpen(false)}
          className="fixed inset-0 bg-black/65 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Carrito de compras"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl max-w-5xl w-full shadow-2xl relative animate-scale-in max-h-[90dvh] overflow-y-auto p-4 sm:p-8"
          >
            {/* Botón de Cerrar */}
            <button
              type="button"
              onClick={() => handleCartOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              title="Cerrar Carrito (Esc)"
              aria-label="Cerrar modal del carrito"
            >
              <i className="bi bi-x-lg text-sm" aria-hidden="true"></i>
            </button>

            <Carrito onBackToCatalog={() => handleCartOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
