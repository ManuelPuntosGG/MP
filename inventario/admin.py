from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import Producto, OrdenServicio, AvanceOrden, Categoria

# 1. Configuración de Categorías y Productos
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'descripcion')
    search_fields = ('nombre',)

class ProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'precio', 'stock', 'disponible')
    list_filter = ('categoria', 'disponible')
    search_fields = ('nombre', 'descripcion')


# 2. Configuración del Sistema de Soporte Técnico (Inlines)
class AvanceOrdenInline(admin.TabularInline):
    """Permite gestionar los avances de la reparación dentro del mismo ticket"""
    model = AvanceOrden
    extra = 1  # Muestra un espacio vacío por defecto para añadir un nuevo avance rápido
    fields = ('descripcion', 'imagen')
    readonly_fields = ('fecha',)


class OrdenServicioAdmin(admin.ModelAdmin):
    # Mostramos el nuevo código de rastreo y agregamos la columna de WhatsApp
    list_display = ('codigo_rastreo', 'cliente_nombre', 'equipo', 'estado', 'fecha_ingreso', 'notificar_cliente')
    
    # Filtros laterales para una navegación rápida en el taller
    list_filter = ('estado', 'fecha_ingreso')
    
    # Buscador avanzado por código único, nombre o teléfono del cliente
    search_fields = ('codigo_rastreo', 'cliente_nombre', 'cliente_telefono', 'equipo')
    
    # Ordenar por defecto desde los ingresos más recientes
    ordering = ('-fecha_ingreso',)
    
    # Integra la bitácora de avances dentro de la vista detallada de la orden
    inlines = [AvanceOrdenInline]

    # Método para renderizar el botón estético de WhatsApp en la lista de registros
    def notificar_cliente(self, obj):
        url = obj.enlace_whatsapp()
        return mark_safe(
            f'<a href="{url}" target="_blank" style="'
            f'background-color: #25D366; color: white; '
            f'padding: 5px 10px; border-radius: 6px; '
            f'text-decoration: none; font-weight: 600; '
            f'font-size: 0.75rem; display: inline-block;">'
            f'💬 WhatsApp</a>'
        )
    
    # Título que llevará la columna en la tabla del panel administrador
    notificar_cliente.short_description = 'Acción'


# 3. Registro de Modelos en el Panel
admin.site.register(Categoria, CategoriaAdmin)
admin.site.register(Producto, ProductoAdmin)
admin.site.register(OrdenServicio, OrdenServicioAdmin)
# Nota: Ya no es necesario registrar 'AvanceOrden' de forma individual
# porque se gestiona directamente desde dentro de cada OrdenServicio.