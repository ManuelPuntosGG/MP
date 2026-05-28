import os
import dj_database_url
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-sb3r5629a&^gu_hq19ue=@#laytjq@b!@2f_^1_tf2ul48u9^y')

# DEBUG: False en producción, True solo si la variable ENV es 'development'
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = ['mp-tech-dl5s.onrender.com', '127.0.0.1', 'localhost']

# Application definition
INSTALLED_APPS = [
    'jazzmin',
    'django.contrib.admin', # Dejado solo aquí arriba con su coma
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'storages',             # ¡Corregido! Ya no se fusiona con admin
    'inventario',
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