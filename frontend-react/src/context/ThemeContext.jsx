import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('mptech_theme');
    return savedTheme ? savedTheme : 'dark'; // Default a dark mode
  });

  useEffect(() => {
    const root = window.document.documentElement;
    console.log("Aplicando tema:", theme);
    if (theme === 'dark') {
      root.classList.add('dark');
      console.log("Clase 'dark' agregada a html. Clases actuales:", root.className);
    } else {
      root.classList.remove('dark');
      console.log("Clase 'dark' eliminada de html. Clases actuales:", root.className);
    }
    localStorage.setItem('mptech_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
