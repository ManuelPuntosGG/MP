import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Catalogo from './pages/Catalogo';
import Carrito from './pages/Carrito';
import Login from './pages/Login';
import Perfil from './pages/Perfil';
import Importaciones from './pages/Importaciones';
import Rastreo from './pages/Rastreo';
import Inicio from './pages/Inicio';
import DetalleImportacion from './pages/DetalleImportacion';



function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route path="catalogo" element={<Catalogo />} />
          <Route path="importaciones" element={<Importaciones />} />
          <Route path="rastrear" element={<Rastreo />} />
          <Route path="importacion/:codigo" element={<DetalleImportacion />} />
          <Route path="carrito" element={<Carrito />} />
          <Route path="login" element={<Login />} />
          <Route path="perfil" element={<Perfil />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
