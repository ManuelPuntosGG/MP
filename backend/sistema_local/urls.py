from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView 

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('inventario.urls')),
    path('manifest.json', TemplateView.as_view(template_name='pwa/manifest.json', content_type='application/json'), name='manifest'),
    path('sw.js', TemplateView.as_view(template_name='pwa/sw.js', content_type='application/javascript'), name='sw'),
]

# CORRECCIÓN: Quitamos 'if settings.DEBUG' para que también sirva imágenes en Render
if settings.MEDIA_URL and settings.MEDIA_ROOT:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
