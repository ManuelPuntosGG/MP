import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';

export interface CartItem {
  producto_id: number;
  nombre: string;
  precio: string | number;
  imagen?: string;
  cantidad: number;
  stock: number;
}

export interface CartContextType {
  cart: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, newQuantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('mptech_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  useEffect(() => {
    localStorage.setItem('mptech_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: any) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.producto_id === product.id);
      if (existingItem) {
        if (existingItem.cantidad >= product.stock) {
          return prevCart;
        }
        return prevCart.map(item => 
          item.producto_id === product.id 
            ? { ...item, cantidad: item.cantidad + 1 } 
            : item
        );
      }
      if (product.stock <= 0) return prevCart;
      return [...prevCart, {
        producto_id: product.id,
        nombre: product.nombre,
        precio: product.precio,
        imagen: product.imagen,
        cantidad: 1,
        stock: product.stock
      }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prevCart => prevCart.filter(item => item.producto_id !== productId));
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCart(prevCart => prevCart.map(item => 
      item.producto_id === productId 
        ? { ...item, cantidad: Math.min(newQuantity, item.stock) } 
        : item
    ));
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);
  const totalAmount = cart.reduce((sum, item) => sum + (parseFloat(item.precio.toString()) * item.cantidad), 0);

  const contextValue = useMemo(() => ({
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
    totalAmount
  }), [cart, totalItems, totalAmount]);

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
