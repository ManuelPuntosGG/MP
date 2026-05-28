from django.contrib import admin
from django.urls import path
from inventario import views
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView 

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.inicio, name='inicio'),                          # Portada / Landing Page
    path('catalogo/', views.catalogo, name='catalogo'),             # Catálogo de componentes
    path('rastreo/', views.rastrear_ticket, name='rastrear_ticket'),# Rastreador de reparaciones
    path('rastreo/presupuesto/<int:pk>/<str:accion>/', views.responder_presupuesto, name='responder_presupuesto'),
    path('solicitar/', views.solicitar_reparacion, name='solicitar_reparacion'),
    path('imprimir-ticket/<int:pk>/', views.imprimir_ticket, name='imprimir_ticket'),
    path('manifest.json', TemplateView.as_view(template_name='pwa/manifest.json', content_type='application/json'), name='manifest'),
    path('sw.js', TemplateView.as_view(template_name='pwa/sw.js', content_type='application/javascript'), name='sw'),
]

# CORRECCIÓN: Quitamos 'if settings.DEBUG' para que también sirva imágenes en Render
if settings.MEDIA_URL and settings.MEDIA_ROOT:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)