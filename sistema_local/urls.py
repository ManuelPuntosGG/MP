from django.contrib import admin
from django.urls import path
from inventario import views

# Herramientas necesarias para que Django pueda mostrar imágenes en desarrollo
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.inicio, name='inicio'),                 # Portada / Landing Page
    path('catalogo/', views.catalogo, name='catalogo'),    # Catálogo de componentes
    path('rastreo/', views.rastrear_ticket, name='rastrear_ticket'), # Rastreador de reparaciones
]

# Esto le dice a Django: "Si estás en modo desarrollo (DEBUG=True), habilita la carpeta media"
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)