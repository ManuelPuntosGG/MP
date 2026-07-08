# Contexto del Proyecto y Caja de Herramientas (MP Tech)

Este archivo sirve para guiar a los agentes de IA y desarrolladores sobre el estado actual, arquitectura y herramientas utilizadas en el proyecto de **MP Tech**.

---

## 📌 Contexto del Desarrollo en Curso

El proyecto se encuentra en una fase de **transición arquitectónica completa** de una arquitectura tradicional monolítica a una aplicación desacoplada (Frontend en React + Backend de API en Django).

1. **Migración del Frontend a React**: Toda la interfaz del cliente (Página de Inicio, Catálogo, Carrito de Compras, Cotizador de Importaciones, Rastreo de Reparaciones, Gestión de Perfil y Autenticación) ha sido migrada a una Single Page Application (SPA) moderna desarrollada en React.
2. **Backend como API REST**: El backend desarrollado en Django ha sido limpiado de sus vistas HTML legacy y ahora funciona exclusivamente como una API de servicios REST, además de servir el Panel de Control Interno (`/admin/` y `/dashboard/`) y la generación e impresión de tickets de servicio en formato térmico.
3. **Rama Activa**: Todo el desarrollo seguro se está llevando a cabo en la rama `React` antes de ser integrado definitivamente a `main` por el equipo de desarrollo.

---

## 🛠️ Caja de Herramientas y Stack Tecnológico

El proyecto está compuesto por los siguientes componentes clave y dependencias:

### Backend (Python / Django)
- **Django (v6.0+)**: Framework web principal que maneja la base de datos, el ORM y la lógica de negocio.
- **Django REST Framework (v3.17.1)**: Utilizado para la creación de endpoints de la API consumida por el frontend de React.
- **Django CORS Headers (v4.9.0)**: Permite la comunicación segura y el intercambio de recursos de origen cruzado (CORS) entre el servidor de desarrollo de React (`localhost:5173`) y Django.
- **Django Unfold**: Panel de administración moderno y estilizado con la paleta de colores corporativos de MP Tech.
- **WhiteNoise / storages**: Manejo de archivos estáticos y almacenamiento multimedia (con soporte local o Supabase S3 en producción).

### Frontend (React / Node.js)
- **React (v19.0+)**: Librería principal para la creación de la interfaz de usuario interactiva.
- **Vite**: Servidor de desarrollo rápido y empaquetador de producción.
- **Tailwind CSS (v3.4+)**: Framework CSS utilitario utilizado para construir una interfaz premium, responsiva, con soporte nativo de modo oscuro (dark mode) y transiciones fluidas.
- **React Router Dom (v7.1+)**: Enrutamiento declarativo del lado del cliente.
- **Axios**: Cliente HTTP para realizar peticiones asíncronas a los endpoints de la API de Django.

### Base de Datos y Servidor
- **SQLite**: Utilizado para entornos de desarrollo local (`db.sqlite3`).
- **PostgreSQL**: Configurado mediante `dj-database-url` para el entorno de producción (Render).

---

## 📁 Estructura del Repositorio

- `/backend/`: Carpeta principal que contiene todo el código y configuración de Django.
  - `/backend/sistema_local/`: Configuración central de Django (CORS, seguridad, base de datos).
  - `/backend/inventario/`: Aplicación Django (API REST, modelos, validaciones).
  - `/backend/media/`: Directorio de archivos cargados por los usuarios.
- `/frontend-react/`: Código fuente de la SPA de React (Vite).
