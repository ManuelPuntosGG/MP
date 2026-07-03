from django.contrib import admin
from django.urls import path, include
from inventario import views
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView 

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.inicio, name='inicio'),                          # Portada / Landing Page
    path('catalogo/', views.catalogo, name='catalogo'),             # Catálogo de componentes
    path('rastreo/', views.rastrear_orden, name='rastrear_ticket'),
    path('solicitar/', views.solicitar_reparacion, name='solicitar_reparacion'),
    path('rastreo/presupuesto/<int:pk>/<str:accion>/', views.responder_presupuesto, name='responder_presupuesto'),
    path('imprimir-ticket/<int:pk>/', views.imprimir_ticket, name='imprimir_ticket'),
    path('manifest.json', TemplateView.as_view(template_name='pwa/manifest.json', content_type='application/json'), name='manifest'),
    path('sw.js', TemplateView.as_view(template_name='pwa/sw.js', content_type='application/javascript'), name='sw'),
    path('', include('pwa.urls')), # <-- NUEVO: Enlaza el Service Worker de la PWA
    path('importaciones/', views.cotizador_auto, name='cotizador_auto'),
]

# CORRECCIÓN: Quitamos 'if settings.DEBUG' para que también sirva imágenes en Render
if settings.MEDIA_URL and settings.MEDIA_ROOT:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)