import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import PageLoader from './components/PageLoader';

// Lazy loading de las páginas para Code Splitting
const Inicio = React.lazy(() => import('./pages/Inicio'));
const Catalogo = React.lazy(() => import('./pages/Catalogo'));
const Importaciones = React.lazy(() => import('./pages/Importaciones'));
const Rastreo = React.lazy(() => import('./pages/Rastreo'));
const DetalleImportacion = React.lazy(() => import('./pages/DetalleImportacion'));
const Login = React.lazy(() => import('./pages/Login'));
const Perfil = React.lazy(() => import('./pages/Perfil'));

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Inicio />} />
            <Route path="catalogo" element={<Catalogo />} />
            <Route path="importaciones" element={<Importaciones />} />
            <Route path="rastrear" element={<Rastreo />} />
            <Route path="importacion/:codigo" element={<DetalleImportacion />} />
            <Route path="login" element={<Login />} />
            <Route path="perfil" element={<Perfil />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
