import os
import dj_database_url
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
SECRET_KEY = os.environ.get('SECRET_KEY')

# DEBUG: True por defecto localmente. Setear "False" en producción en Render.
DEBUG = os.environ.get('DEBUG', 'True') == 'True'

if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'django-insecure-dev-key-not-for-production'
    else:
        raise ValueError("SECRET_KEY environment variable is required")

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# 🔒 CRÍTICO PARA RENDER: Evita que Django bloquee los formularios
CSRF_TRUSTED_ORIGINS = os.environ.get('CSRF_TRUSTED_ORIGINS', 'http://127.0.0.1:8000').split(',')

# URL base del sitio (para QR, WhatsApp, etc.)
SITE_BASE_URL = os.environ.get('SITE_BASE_URL', 'http://127.0.0.1:8000')

# Application definition
INSTALLED_APPS = [
    'unfold',             # 🎨 Admin con estilo moderno
    'django.contrib.admin', # Dejado solo aquí arriba con su coma
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',          # Para permitir peticiones desde Vite
    'rest_framework',       # Para construir la API
    'storages',             # ¡Corregido! Ya no se fusiona con admin
    'inventario',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware', # Vital para archivos estáticos
    'corsheaders.middleware.CorsMiddleware', # Habilitar CORS
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

# Autenticación con email
AUTHENTICATION_BACKENDS = ['inventario.auth_backend.EmailBackend', 'django.contrib.auth.backends.ModelBackend']

# Email (consola para desarrollo por defecto, SMTP de Gmail en producción sin costo)
EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND',
    'django.core.mail.backends.console.EmailBackend' if DEBUG else 'django.core.mail.backends.smtp.EmailBackend'
)
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', 'grupomptech@gmail.com')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'MP Tech <grupomptech@gmail.com>')
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'grupomptech@gmail.com')

# URL del Frontend para enlaces en los correos y redirecciones
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://mp-tech-4x0a.onrender.com' if not DEBUG else 'http://localhost:5173')

# Redirigir login required a React (la ruta /login es manejada por el frontend)
LOGIN_URL = '/login'

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
# 🔒 CONFIGURACIÓN DE SEGURIDAD HTTPS (PRODUCCIÓN)
# ==============================================================================
import sys
TESTING = 'test' in sys.argv

if not DEBUG:
    SECURE_SSL_REDIRECT = not TESTING
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_SAMESITE = 'None'
    CSRF_COOKIE_SAMESITE = 'None'


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
    
    # Paleta de colores para botones y acentos (Usamos rosa/rojo cyber-tech)
    "COLORS": {
        "primary": {
            "50": "255, 241, 242",
            "100": "255, 228, 230",
            "200": "254, 205, 211",
            "300": "253, 164, 175",
            "400": "251, 113, 133",
            "500": "244, 63, 94",
            "600": "225, 29, 72",
            "700": "190, 24, 74",
            "800": "159, 18, 57",
            "900": "136, 19, 55",
            "950": "76, 5, 25",
        },
    },
}

# ==============================================================================
# 🚀 CONFIGURACIÓN DE REACT, CORS Y API (DRF)
# ==============================================================================
env_cors = os.environ.get('CORS_ALLOWED_ORIGINS', '')
CORS_ALLOWED_ORIGINS = env_cors.split(',') if env_cors else []

# Agregar siempre los orígenes de desarrollo local de Vite
local_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

for origin in local_origins:
    if origin not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(origin)

CORS_ALLOW_CREDENTIALS = True

# Agregar orígenes de Vite a CSRF si no están presentes
for origin in local_origins:
    if origin not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(origin)

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny', # Permite lectura pública por defecto
    ],
}