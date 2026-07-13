import decimal
from django.contrib import admin
from django.db import models 
from django.utils.html import format_html 
from django.urls import reverse 
from django.forms import Textarea 
from django.contrib.auth.models import Group 

# SimpleListFilter se importa desde django.contrib.admin
from django.contrib.admin import SimpleListFilter 
from unfold.admin import ModelAdmin, TabularInline
from unfold.decorators import action

# Importación de tus modelos locales
from .models import Producto, OrdenServicio, AvanceOrden, Categoria, LineaPresupuesto, PedidoImportacion, PedidoCatalogo, UserProfile, Pago


# =========================================================
# 🎛️ FILTRO PERSONALIZADO ADAPTADO A UNFOLD
# =========================================================
class ReparacionesActivasFilter(SimpleListFilter):
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
class CategoriaAdmin(ModelAdmin):
    list_display = ('nombre', 'descripcion')
    search_fields = ('nombre',)

class ProductoAdmin(ModelAdmin):
    list_display = ('nombre', 'categoria', 'precio', 'stock', 'disponible')
    list_filter = ('categoria', 'disponible')
    search_fields = ('nombre', 'descripcion')
    list_editable = ('precio', 'stock', 'disponible')


# =========================================================
# 2. Inlines Optimizados con Estilo Unfold
# =========================================================
class AvanceOrdenInline(TabularInline):
    """Permite gestionar la bitácora de avances de reparación"""
    model = AvanceOrden
    extra = 0 
    fields = ('descripcion', 'imagen', 'mostrar_imagen')
    readonly_fields = ('mostrar_imagen',)
    
    formfield_overrides = {
        models.TextField: {'widget': Textarea(attrs={'rows': 2, 'cols': 35, 'style': 'resize:none; font-size: 0.9rem; border-radius: 6px;'})},
    }

    def mostrar_imagen(self, obj):
        if obj.imagen:
            return format_html(
                '<a href="{0}" target="_blank">'
                '<img src="{0}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0;" />'
                '</a>', 
                obj.imagen.url
            )
        return "-"
    mostrar_imagen.short_description = 'Vista'


class LineaPresupuestoInline(TabularInline):
    """Permite añadir repuestos, conceptos y montos manuales"""
    model = LineaPresupuesto
    extra = 0 

class PagoInline(TabularInline):
    """Permite visualizar y verificar pagos anclados a esta orden o pedido"""
    model = Pago
    extra = 0
    readonly_fields = ('fecha_registro',)
    fields = ('estado', 'metodo', 'monto_usd', 'fecha_pago', 'referencia', 'concepto', 'fecha_registro')


# =========================================================
# 3. Configuración Principal del Taller
# =========================================================
class OrdenServicioAdmin(ModelAdmin):
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
    
    # 🎨 CONFIGURACIÓN DE MEDIOS PARA INYECTAR EL CONTRASTE MÓVIL
    class Media:
        css = {
            'all': ('inventario/css/custom_admin.css',)
        }
        
    list_editable = ('estado',)
    list_filter = (ReparacionesActivasFilter, 'estado', 'presupuesto_estado', 'fecha_ingreso')
    search_fields = ('codigo_rastreo', 'cliente_nombre', 'cliente_telefono', 'equipo')
    ordering = ('-fecha_ingreso',)
    
    inlines = [AvanceOrdenInline, LineaPresupuestoInline, PagoInline]
    readonly_fields = ('codigo_rastreo', 'fecha_ingreso', 'qr_code', 'presupuesto_estado')

    # 🚀 CONFIGURACIÓN DE DISEÑO EN REJILLA (Campos emparejados lado a lado)
    fieldsets = (
        ('Datos del Cliente', {
            'fields': (
                ('cliente_nombre', 'cliente_telefono'),  # Fila 1: Nombre y Teléfono en PC
                ('codigo_rastreo', 'equipo'),           # Fila 2: Código y Equipo en PC
                'falla_reportada',                      # Fila 3: Ocupa todo el ancho
            )
        }),
        ('Control de Estado', {
            'fields': (
                ('estado', 'presupuesto_estado'),       # Fila 1: Los dos estados juntos
            )
        }),
        ('Fechas y Sistema', {
            'fields': (
                ('fecha_ingreso', 'fecha_entrega'),     # Fila 1: Fechas organizadas
                'qr_code',                              # Fila 2: Código QR completo
            ),
            'classes': ('collapse',) 
        }),
    )

    # Decoradores de acción propios de Unfold
    @action(description='🔧 Marcar seleccionados como REPARADOS')
    def marcar_reparados(self, request, queryset):
        actualizados = queryset.update(estado='REPARADO')
        self.message_user(request, f"{actualizados} órdenes actualizadas a REPARADO.")

    @action(description='📦 Marcar seleccionados como ENTREGADOS')
    def marcar_entregados(self, request, queryset):
        actualizados = queryset.update(estado='ENTREGADO')
        self.message_user(request, f"{actualizados} órdenes actualizadas a ENTREGADO.")

    @action(description='🔄 Revertir Presupuesto a PENDIENTE')
    def revertir_presupuesto(self, request, queryset):
        actualizados = queryset.update(presupuesto_estado='PENDIENTE')
        self.message_user(request, f"{actualizados} presupuestos revertidos a PENDIENTE por aprobar.")

    actions = [marcar_reparados, marcar_entregados, revertir_presupuesto]

    # Botón de WhatsApp estilizado para la paleta de Unfold
    def notificar_cliente(self, obj):
        url = obj.enlace_whatsapp
        return format_html(
            '<a href="{}" target="_blank" class="px-2.5 py-1 text-xs font-semibold rounded bg-green-600 hover:bg-green-700 text-white inline-block shadow-sm transition-colors text-center">💬 Enviar</a>',
            url
        )
    notificar_cliente.short_description = 'Aviso'

    # Botón de Ticket estilizado en sintonía con Tailwind (Rojo cyber-tech)
    def imprimir_ticket_link(self, obj):
        url = reverse('inventario:imprimir_ticket', args=[obj.pk])
        return format_html(
            '<a href="{}" target="_blank" class="px-2.5 py-1 text-xs font-semibold rounded bg-rose-600 hover:bg-rose-700 text-white inline-block shadow-sm transition-colors text-center">🖨️ Ticket</a>',
            url
        )
    imprimir_ticket_link.short_description = 'Imprimir'


# =========================================================
# 4. Registro de Modelos e Interfaz de Usuario
# =========================================================
admin.site.register(Categoria, CategoriaAdmin)
admin.site.register(Producto, ProductoAdmin)
admin.site.register(OrdenServicio, OrdenServicioAdmin)


class PedidoImportacionAdmin(ModelAdmin):
    list_display = ['codigo_seguimiento', 'cliente_nombre', 'total_usd', 'pago_inicial_usd', 'saldo_pendiente_usd', 'estado', 'fecha']
    list_filter = ['estado', 'fecha']
    search_fields = ['codigo_seguimiento', 'cliente_nombre', 'cliente_telefono']
    readonly_fields = [
        'codigo_seguimiento', 'fecha', 'total_ves',
        'tasa_confirmacion', 'pago_inicial_usd', 'pago_inicial_ves',
        'tasa_entrega', 'saldo_pendiente_usd', 'saldo_pendiente_ves'
    ]
    fieldsets = [
        ('Información del Cliente', {'fields': ['usuario', 'cliente_nombre', 'cliente_telefono']}),
        ('Detalles del Pedido', {'fields': ['estado', 'total_usd', 'total_ves', 'productos_json', 'nota']}),
        ('Pago 50/50', {'fields': [('tasa_confirmacion', 'pago_inicial_usd', 'pago_inicial_ves'), ('tasa_entrega', 'saldo_pendiente_usd', 'saldo_pendiente_ves')]}),
        ('Seguimiento', {'fields': ['carrier_nombre', 'carrier_tracking', 'codigo_seguimiento', 'fecha']}),
    ]
    inlines = [PagoInline]


class PedidoCatalogoAdmin(ModelAdmin):
    list_display = ['codigo_seguimiento', 'cliente_nombre', 'total_usd', 'estado', 'fecha']
    list_filter = ['estado', 'fecha']
    search_fields = ['codigo_seguimiento', 'cliente_nombre']
    readonly_fields = ['codigo_seguimiento', 'fecha']
    fieldsets = [
        ('Información del Cliente', {'fields': ['usuario', 'cliente_nombre', 'cliente_telefono']}),
        ('Detalles del Pedido', {'fields': ['estado', 'total_usd', 'productos_json']}),
        ('Seguimiento', {'fields': ['codigo_seguimiento', 'fecha']}),
    ]
    inlines = [PagoInline]
    actions = ['cancelar_pedidos']

    @action(description="Cancelar pedidos seleccionados (Restaurando stock)")
    def cancelar_pedidos(self, request, queryset):
        pedidos_pendientes = queryset.filter(estado='PENDIENTE')
        contador = 0
        for pedido in pedidos_pendientes:
            pedido.estado = 'CANCELADO'
            pedido.save()
            contador += 1
        
        self.message_user(request, f"Se han cancelado {contador} pedidos y se ha restaurado su stock con éxito.")


class UserProfileAdmin(ModelAdmin):
    list_display = ['usuario', 'nombre_completo', 'telefono']
    search_fields = ['usuario__email', 'nombre_completo', 'telefono']


admin.site.register(PedidoImportacion, PedidoImportacionAdmin)
admin.site.register(PedidoCatalogo, PedidoCatalogoAdmin)
admin.site.register(UserProfile, UserProfileAdmin)

class PagoAdmin(ModelAdmin):
    list_display = ('id', 'metodo', 'monto_usd', 'estado', 'fecha_pago', 'referencia', 'get_orden')
    list_filter = ('estado', 'metodo', 'fecha_pago')
    search_fields = ('referencia', 'concepto', 'orden_servicio__codigo_rastreo', 'pedido_importacion__codigo_seguimiento', 'pedido_catalogo__codigo_seguimiento')
    list_editable = ('estado',)

    def get_orden(self, obj):
        if obj.orden_servicio: return f"Servicio: {obj.orden_servicio.codigo_rastreo}"
        if obj.pedido_importacion: return f"Importación: {obj.pedido_importacion.codigo_seguimiento}"
        if obj.pedido_catalogo: return f"Catálogo: {obj.pedido_catalogo.codigo_seguimiento}"
        return "-"
    get_orden.short_description = "Orden / Pedido"

admin.site.register(Pago, PagoAdmin)

# Eliminar la gestión de "Grupos de usuarios" de Django por defecto
admin.site.unregister(Group)

# Personalización del Panel (Unfold lo hereda y estiliza en la barra superior)
admin.site.site_header = "MP Tech • Panel de Control"
admin.site.site_title = "MP Tech Taller"
admin.site.index_title = "Gestión Interna de Reparaciones"