from django.contrib import admin
from .models import Producto, OrdenServicio, AvanceOrden, Categoria

# Configuramos cómo se ven las tablas en tu panel de administración
class ProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'precio', 'stock', 'disponible')
    list_filter = ('categoria', 'disponible')
    search_fields = ('nombre',)

class OrdenServicioAdmin(admin.ModelAdmin):
    list_display = ('id', 'cliente_nombre', 'equipo', 'estado', 'fecha_ingreso')
    list_filter = ('estado', 'fecha_ingreso')
    search_fields = ('cliente_nombre', 'equipo', 'id')

# Registramos los modelos
admin.site.register(Categoria)
admin.site.register(Producto, ProductoAdmin)
admin.site.register(OrdenServicio, OrdenServicioAdmin)
admin.site.register(AvanceOrden) # <- Nueva línea agregada