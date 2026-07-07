import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Catalogo from './pages/Catalogo';
import Carrito from './pages/Carrito';

// Placeholders para futuras páginas
const Placeholder = ({ title }) => (
  <div className="flex items-center justify-center h-[60vh]">
    <h1 className="text-3xl font-bold text-gray-500">{title} - En construcción</h1>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Catalogo />} />
          <Route path="importaciones" element={<Placeholder title="Importaciones" />} />
          <Route path="rastrear" element={<Placeholder title="Rastrear Orden" />} />
          <Route path="carrito" element={<Carrito />} />
          <Route path="login" element={<Placeholder title="Ingresar" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
