from django.contrib import admin
from django.urls import path
from inventario import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.inicio, name='inicio'),                          # Portada / Landing Page
    path('catalogo/', views.catalogo, name='catalogo'),             # Catálogo de componentes
    path('rastreo/', views.rastrear_ticket, name='rastrear_ticket'),# Rastreador de reparaciones
    path('solicitar/', views.solicitar_reparacion, name='solicitar_reparacion'),
    path('imprimir-ticket/<int:pk>/', views.imprimir_ticket, name='imprimir_ticket'),
]

# CORRECCIÓN: Quitamos 'if settings.DEBUG' para que también sirva imágenes en Render
if settings.MEDIA_URL and settings.MEDIA_ROOT:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)