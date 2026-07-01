import os
import dj_database_url
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-sb3r5629a&^gu_hq19ue=@#laytjq@b!@2f_^1_tf2ul48u9^y')

# DEBUG: True por defecto localmente. Se vuelve False en Render si configuras la variable de entorno.
DEBUG = os.environ.get('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = ['mp-tech-dl5s.onrender.com', '127.0.0.1', 'localhost']

# 🔒 CRÍTICO PARA RENDER: Evita que Django bloquee los formularios (Admin login, solicitudes, etc.)
CSRF_TRUSTED_ORIGINS = [
    'https://mp-tech-dl5s.onrender.com',
]

# Application definition
INSTALLED_APPS = [
    'unfold',             # 🎨 Admin con estilo moderno
    'django.contrib.admin', # Dejado solo aquí arriba con su coma
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'storages',             # ¡Corregido! Ya no se fusiona con admin
    'inventario',
    'pwa',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware', # Vital para archivos estáticos
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'sistema_local.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'sistema_local.wsgi.application'

# Database configuration (Switch automático entre Postgres y SQLite)
DATABASES = {
    'default': dj_database_url.config(
        default='sqlite:///' + str(BASE_DIR / 'db.sqlite3'),
        conn_max_age=600
    )
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'es-co'
TIME_ZONE = 'America/Caracas'
USE_I18N = True
USE_TZ = True


# ==============================================================================
# CONFIGURACIÓN DE ARCHIVOS ESTÁTICOS Y MULTIMEDIA (LOCAL VS SUPABASE)
# ==============================================================================

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

WHITENOISE_MANIFEST_STRICT = False

# Base por defecto para Django 4.2+ (Local)
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage", # 🛠️ CORREGIDO: Quitamos "Manifest"
    },
}
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Si estamos en Render y configuraste el Bucket de Supabase:
if 'AWS_STORAGE_BUCKET_NAME' in os.environ:
    # Cambiamos el backend de almacenamiento local a S3 de Supabase
    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
    }
    
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_STORAGE_BUCKET_NAME')
    AWS_S3_ENDPOINT_URL = os.environ.get('AWS_S3_ENDPOINT_URL') # Ej: https://xyz.supabase.co/storage/v1/s3
    
    AWS_QUERYSTRING_AUTH = False
    AWS_DEFAULT_ACL = None
    AWS_S3_FILE_OVERWRITE = False
    
    # 2. EL TRUCO MAESTRO: Forzar la URL pública nativa de Supabase
    # Si tu endpoint es: https://xyz.supabase.co/storage/v1/s3
    # Convertimos la salida a: xyz.supabase.co/storage/v1/object/public/tu-bucket
    if AWS_S3_ENDPOINT_URL:
        clean_domain = AWS_S3_ENDPOINT_URL.replace('https://', '').replace('http://', '').replace('/storage/v1/s3', '')
        AWS_S3_CUSTOM_DOMAIN = f"{clean_domain}/storage/v1/object/public/{AWS_STORAGE_BUCKET_NAME}"
        
        # Seteamos la URL final
        MEDIA_URL = f"https://{AWS_S3_CUSTOM_DOMAIN}/"

# ==============================================================================
# CONFIGURACIÓN DE LA PWA (PROGRESSIVE WEB APP)
# ==============================================================================
PWA_APP_NAME = 'MP Tech Sistema'
PWA_APP_SHORT_NAME = 'MP Tech'
PWA_APP_DESCRIPTION = "Sistema de Gestión e Inventario para Taller - MP Tech"
PWA_APP_THEME_COLOR = '#1e1e2f'  # Color de la barra de estado del tlf
PWA_APP_BACKGROUND_COLOR = '#ffffff'
PWA_APP_DISPLAY = 'standalone'  # Hace que se oculte la barra de navegación del navegador
PWA_APP_SCOPE = '/'
PWA_APP_ORIENTATION = 'any'
PWA_APP_START_URL = '/admin/'   # 🚀 Te redirige directo al login administrativo al abrir la app
PWA_APP_STATUS_BAR_COLOR = 'default'
PWA_APP_DIR = 'ltr'
PWA_APP_LANG = 'es-VE'

# Rutas de los iconos (Debes crear estas imágenes en tu carpeta static)
PWA_APP_ICONS = [
    {
        'src': '/static/images/icon-192x192.png',
        'sizes': '192x192'
    },
    {
        'src': '/static/images/icon-512x512.png',
        'sizes': '512x512'
    }
]
PWA_APP_ICONS_SPLASH = [
    {
        'src': '/static/images/icon-512x512.png',
        'sizes': '512x512'
    }
]

# ==============================================================================
# 🎨 CONFIGURACIÓN AVANZADA DE DJANGO UNFOLD (ESTÉTICA MP TECH)
# ==============================================================================
UNFOLD = {
    "SITE_HEADER": "MP Tech • Panel de Control",
    "SITE_TITLE": "MP Tech Taller",
    "INDEX_TITLE": "Gestión Interna de Reparaciones",
    "SITE_SYMBOL": "🔧", # Icono de la pestaña del navegador
    "SHOW_HISTORY": True, # Muestra historial de cambios rápidos
    "SHOW_VIEW_ON_SITE": True, # Enlace rápido para ver el producto en el catálogo
    
    # Paleta de colores para botones y acentos (Usamos zinc/rojo oscuro)
    "COLORS": {
        "primary": {
            "50": "250, 250, 250",
            "100": "244, 244, 245",
            "200": "228, 228, 231",
            "300": "212, 212, 216",
            "400": "161, 161, 170",
            "500": "113, 113, 122",
            "600": "82, 82, 91",
            "700": "63, 63, 70",
            "800": "39, 39, 42",
            "900": "24, 24, 27",
            "950": "9, 9, 11",
        },
    },
}