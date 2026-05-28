from django.contrib import admin
from django.utils.html import format_html  # Para renderizar los botones de forma segura
from django.urls import reverse           # Para resolver las rutas del ticket
from .models import Producto, OrdenServicio, AvanceOrden, Categoria, LineaPresupuesto

# ==========================================
# 1. Configuración de Categorías y Productos
# ==========================================
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'descripcion')
    search_fields = ('nombre',)

class ProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'precio', 'stock', 'disponible')
    list_filter = ('categoria', 'disponible')
    search_fields = ('nombre', 'descripcion')


# ==========================================
# 2. Inlines (Deben ir ANTES de OrdenServicioAdmin)
# ==========================================
class AvanceOrdenInline(admin.TabularInline):
    """Permite gestionar la bitácora de avances de reparación"""
    model = AvanceOrden
    extra = 1
    fields = ('descripcion', 'imagen')
    readonly_fields = ('fecha',)

class LineaPresupuestoInline(admin.TabularInline):
    """Permite añadir repuestos, conceptos y montos manuales"""
    model = LineaPresupuesto
    extra = 1
    fields = ('concepto', 'monto')


# ==========================================
# 3. Configuración Principal del Taller
# ==========================================
class OrdenServicioAdmin(admin.ModelAdmin):
    # Columnas del panel principal
    list_display = (
        'codigo_rastreo', 
        'cliente_nombre', 
        'equipo', 
        'estado', 
        'presupuesto_estado', 
        'fecha_ingreso', 
        'notificar_cliente', 
        'imprimir_ticket_link'
    )
    
    # Filtros laterales y buscadores
    list_filter = ('estado', 'presupuesto_estado', 'fecha_ingreso')
    search_fields = ('codigo_rastreo', 'cliente_nombre', 'cliente_telefono', 'equipo')
    ordering = ('-fecha_ingreso',)
    
    # 🛠️ Aquí integramos ambos bloques hijos dentro de la orden
    inlines = [AvanceOrdenInline, LineaPresupuestoInline]

    # Botón dinámico de WhatsApp
    def notificar_cliente(self, obj):
        url = obj.enlace_whatsapp()
        return format_html(
            '<a href="{}" target="_blank" style="background-color: #25D366; color: white; '
            'padding: 5px 10px; border-radius: 6px; text-decoration: none; '
            'font-weight: 600; font-size: 0.75rem;">💬 WhatsApp</a>',
            url
        )
    notificar_cliente.short_description = 'WhatsApp'

    # Botón para abrir la vista de impresión térmica
    def imprimir_ticket_link(self, obj):
        url = reverse('imprimir_ticket', args=[obj.pk])
        return format_html(
            '<a href="{}" target="_blank" style="background-color: #3b82f6; color: white; '
            'padding: 5px 10px; border-radius: 6px; text-decoration: none; '
            'font-weight: 600; font-size: 0.75rem;">🖨️ Ticket</a>',
            url
        )
    imprimir_ticket_link.short_description = 'Imprimir'


# ==========================================
# 4. Registro de Modelos en el Panel
# ==========================================
admin.site.register(Categoria, CategoriaAdmin)
admin.site.register(Producto, ProductoAdmin)
admin.site.register(OrdenServicio, OrdenServicioAdmin)