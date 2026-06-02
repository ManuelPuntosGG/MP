from django.contrib import admin
from django.utils.html import format_html  # Para renderizar los botones de forma segura
from django.urls import reverse            # Para resolver las rutas del ticket
from django.forms import Textarea          # NUEVO: Para compactar cuadros de texto en móvil
from django.contrib.auth.models import Group # NUEVO: Para limpiar el panel
from .models import Producto, OrdenServicio, AvanceOrden, Categoria, LineaPresupuesto
from inventario import models

# =========================================================
# 🎛️ FILTRO PERSONALIZADO PARA EL TALLER
# =========================================================
class ReparacionesActivasFilter(admin.SimpleListFilter):
    title = 'Filtro de Trabajo'
    parameter_name = 'filtro_taller'

    def lookups(self, request, model_admin):
        return (
            ('activas', '🔧 Reparaciones Activas'),
            ('historial', '✅ Historial (Entregados/Cancelados)'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'activas':
            return queryset.exclude(estado__in=['ENTREGADO', 'CANCELADO'])
        if self.value() == 'historial':
            return queryset.filter(estado__in=['ENTREGADO', 'CANCELADO'])
        return queryset


# =========================================================
# 1. Configuración de Categorías y Productos
# =========================================================
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'descripcion')
    search_fields = ('nombre',)

class ProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'categoria', 'precio', 'stock', 'disponible')
    list_filter = ('categoria', 'disponible')
    search_fields = ('nombre', 'descripcion')
    list_editable = ('precio', 'stock', 'disponible')


# =========================================================
# 2. Inlines Optimizados para Móvil (PWA)
# =========================================================
class AvanceOrdenInline(admin.TabularInline):
    """Permite gestionar la bitácora de avances de reparación"""
    model = AvanceOrden
    extra = 0  # 🚀 Limpio: No genera filas vacías innecesarias
    fields = ('descripcion', 'imagen', 'mostrar_imagen')
    readonly_fields = ('mostrar_imagen',)
    
    # 🚀 Eficiente: Reduce el tamaño del cuadro de texto para que no ocupe toda la pantalla del teléfono
    formfield_overrides = {
        models.TextField: {'widget': Textarea(attrs={'rows': 2, 'cols': 35, 'style': 'resize:none; font-size: 0.9rem;'})},
    }

    def mostrar_imagen(self, obj):
        if obj.imagen:
            return format_html(
                '<a href="{0}" target="_blank">'
                '<img src="{0}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd;" />'
                '</a>', 
                obj.imagen.url
            )
        return "-"
    mostrar_imagen.short_description = 'Vista'

class LineaPresupuestoInline(admin.TabularInline):
    """Permite añadir repuestos, conceptos y montos manuales"""
    model = LineaPresupuesto
    extra = 0  # 🚀 Limpio: Añades filas solo cuando lo necesitas


# =========================================================
# 3. Configuración Principal del Taller
# =========================================================
class OrdenServicioAdmin(admin.ModelAdmin):
    # Columnas del panel principal
    list_display = (
        'codigo_rastreo', 
        'cliente_nombre', 
        'equipo', 
        'estado',               # 🚀 editable
        'presupuesto_estado',   # 🚀 editable
        'fecha_ingreso', 
        'notificar_cliente', 
        'imprimir_ticket_link'
    )
    
    # 🚀 SUPER OPTIMIZACIÓN: Te permite cambiar los estados directamente desde la lista sin entrar a la orden
    list_editable = ('estado', 'presupuesto_estado')
    
    # Filtros laterales usando nuestro filtro inteligente personalizado
    list_filter = (ReparacionesActivasFilter, 'estado', 'presupuesto_estado', 'fecha_ingreso')
    search_fields = ('codigo_rastreo', 'cliente_nombre', 'cliente_telefono', 'equipo')
    ordering = ('-fecha_ingreso',)
    
    inlines = [AvanceOrdenInline, LineaPresupuestoInline]
    readonly_fields = ('codigo_rastreo', 'fecha_ingreso', 'qr_code')

    fieldsets = (
        ('Datos del Cliente', {
            'fields': ('cliente_nombre', 'cliente_telefono')
        }),
        ('Información del Equipo', {
            'fields': ('codigo_rastreo', 'equipo', 'falla_reportada', 'diagnostico_tecnico')
        }),
        ('Control de Estado', {
            'fields': ('estado', 'presupuesto_estado', 'costo_estimado')
        }),
        ('Fechas y Sistema', {
            'fields': ('fecha_ingreso', 'fecha_entrega', 'qr_code'),
            'classes': ('collapse',) 
        }),
    )

    # Acciones Masivas
    @admin.action(description='🔧 Marcar seleccionados como REPARADOS')
    def marcar_reparados(self, request, queryset):
        actualizados = queryset.update(estado='REPARADO')
        self.message_user(request, f"{actualizados} órdenes actualizadas a REPARADO.")

    @admin.action(description='📦 Marcar seleccionados como ENTREGADOS')
    def marcar_entregados(self, request, queryset):
        actualizados = queryset.update(estado='ENTREGADO')
        self.message_user(request, f"{actualizados} órdenes actualizadas a ENTREGADO.")

    actions = [marcar_reparados, marcar_entregados]

    # Botón dinámico de WhatsApp
    def notificar_cliente(self, obj):
        url = obj.enlace_whatsapp()
        return format_html(
            '<a href="{}" target="_blank" style="background-color: #25D366; color: white; '
            'padding: 6px 12px; border-radius: 20px; text-decoration: none; '
            'font-weight: bold; font-size: 0.75rem; display: inline-block; text-align: center;">💬 Enviar</a>',
            url
        )
    notificar_cliente.short_description = 'Aviso'

    # Botón para abrir la vista de impresión térmica
    def imprimir_ticket_link(self, obj):
        url = reverse('imprimir_ticket', args=[obj.pk])
        return format_html(
            '<a href="{}" target="_blank" style="background-color: #3b82f6; color: white; '
            'padding: 6px 12px; border-radius: 20px; text-decoration: none; '
            'font-weight: bold; font-size: 0.75rem; display: inline-block; text-align: center;">🖨️ Ticket</a>',
            url
        )
    imprimir_ticket_link.short_description = 'Imprimir'


# =========================================================
# 4. Registro de Modelos e Interfaz de Usuario
# =========================================================
admin.site.register(Categoria, CategoriaAdmin)
admin.site.register(Producto, ProductoAdmin)
admin.site.register(OrdenServicio, OrdenServicioAdmin)

# 🚀 LIMPIEZA: Eliminar la gestión de "Grupos de usuarios" de Django que viene por defecto
admin.site.unregister(Group)

# Personalización del Panel
admin.site.site_header = "MP Tech • Panel de Control"
admin.site.site_title = "MP Tech Taller"
admin.site.index_title = "Gestión Interna de Reparaciones"