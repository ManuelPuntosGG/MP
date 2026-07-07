import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('mptech_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  useEffect(() => {
    localStorage.setItem('mptech_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.producto_id === product.id);
      if (existingItem) {
        return prevCart.map(item => 
          item.producto_id === product.id 
            ? { ...item, cantidad: item.cantidad + 1 } 
            : item
        );
      }
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

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.producto_id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    setCart(prevCart => prevCart.map(item => 
      item.producto_id === productId 
        ? { ...item, cantidad: Math.min(newQuantity, item.stock) } 
        : item
    ));
  };

  const clearCart = () => setCart([]);

  const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);
  const totalAmount = cart.reduce((sum, item) => sum + (parseFloat(item.precio) * item.cantidad), 0);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      totalAmount
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
