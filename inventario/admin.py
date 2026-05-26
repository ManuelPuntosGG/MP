from django.contrib import admin
from django.utils.safestring import mark_safe
from django.utils.html import format_html  # Importante para los botones
from django.urls import reverse           # Importante para las rutas
from .models import Producto, OrdenServicio, AvanceOrden, Categoria

# 1. Configuración de Categorías y Productos
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'descripcion')
    search_fields = ('nombre',)

class ProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'precio', 'stock', 'disponible')
    list_filter = ('categoria', 'disponible')
    search_fields = ('nombre', 'descripcion')

# 2. Configuración del Sistema de Soporte Técnico
class AvanceOrdenInline(admin.TabularInline):
    model = AvanceOrden
    extra = 1
    fields = ('descripcion', 'imagen')
    readonly_fields = ('fecha',)

class OrdenServicioAdmin(admin.ModelAdmin):
    # Agregamos 'imprimir_ticket_link' a la lista de columnas
    list_display = ('codigo_rastreo', 'cliente_nombre', 'equipo', 'estado', 'fecha_ingreso', 'notificar_cliente', 'imprimir_ticket_link')
    
    list_filter = ('estado', 'fecha_ingreso')
    search_fields = ('codigo_rastreo', 'cliente_nombre', 'cliente_telefono', 'equipo')
    ordering = ('-fecha_ingreso',)
    inlines = [AvanceOrdenInline]

    # Botón WhatsApp
    def notificar_cliente(self, obj):
        url = obj.enlace_whatsapp()
        return format_html(
            '<a href="{}" target="_blank" style="background-color: #25D366; color: white; '
            'padding: 5px 10px; border-radius: 6px; text-decoration: none; '
            'font-weight: 600; font-size: 0.75rem;">💬 WhatsApp</a>',
            url
        )
    notificar_cliente.short_description = 'WhatsApp'

    # Botón Imprimir Ticket (NUEVO)
    def imprimir_ticket_link(self, obj):
        # Asegúrate de que el nombre de la URL en tu urls.py sea exactamente 'imprimir_ticket'
        url = reverse('imprimir_ticket', args=[obj.pk])
        return format_html(
            '<a href="{}" target="_blank" style="background-color: #3b82f6; color: white; '
            'padding: 5px 10px; border-radius: 6px; text-decoration: none; '
            'font-weight: 600; font-size: 0.75rem;">🖨️ Ticket</a>',
            url
        )
    imprimir_ticket_link.short_description = 'Imprimir'

# 3. Registro de Modelos
admin.site.register(Categoria, CategoriaAdmin)
admin.site.register(Producto, ProductoAdmin)
admin.site.register(OrdenServicio, OrdenServicioAdmin)