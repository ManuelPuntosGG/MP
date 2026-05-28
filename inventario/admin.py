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
    # Optimizado para la gestión de componentes de computación íntegros
    list_display = ('nombre', 'categoria', 'precio', 'stock', 'disponible')
    list_filter = ('categoria', 'disponible')
    search_fields = ('nombre', 'descripcion')
    list_editable = ('precio', 'stock', 'disponible') # Permite editar esto sin entrar al producto


# ==========================================
# 2. Inlines (Deben ir ANTES de OrdenServicioAdmin)
# ==========================================
class AvanceOrdenInline(admin.TabularInline):
    """Permite gestionar la bitácora de avances de reparación"""
    model = AvanceOrden
    extra = 1
    # 🛠️ NUEVO: Agregamos mostrar_imagen a los campos visibles
    fields = ('descripcion', 'imagen', 'mostrar_imagen')
    readonly_fields = ('fecha', 'mostrar_imagen')

    # 🛠️ NUEVO: Función para renderizar la miniatura de la foto
    def mostrar_imagen(self, obj):
        if obj.imagen:
            return format_html(
                '<img src="{}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #ccc;" />', 
                obj.imagen.url
            )
        return "-"
    mostrar_imagen.short_description = 'Vista Previa'

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
    
    list_filter = ('estado', 'presupuesto_estado', 'fecha_ingreso')
    search_fields = ('codigo_rastreo', 'cliente_nombre', 'cliente_telefono', 'equipo')
    ordering = ('-fecha_ingreso',)
    
    inlines = [AvanceOrdenInline, LineaPresupuestoInline]

    # 1. DECLARAR CAMPOS DE SOLO LECTURA (Evita el error de editable=False)
    readonly_fields = ('codigo_rastreo', 'fecha_ingreso', 'qr_code')

    # 2. FIELDSETS ACTUALIZADOS (Incluyendo TODOS los campos de tu modelo)
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
            'classes': ('collapse',) # Hace que este bloque empiece minimizado para no estorbar
        }),
    )

    # 🛠️ NUEVO: Acciones Masivas
    @admin.action(description='Marcar seleccionados como REPARADOS')
    def marcar_reparados(self, request, queryset):
        actualizados = queryset.update(estado='REPARADO')
        self.message_user(request, f"{actualizados} órdenes actualizadas a REPARADO.")

    @admin.action(description='Marcar seleccionados como ENTREGADOS')
    def marcar_entregados(self, request, queryset):
        actualizados = queryset.update(estado='ENTREGADO')
        self.message_user(request, f"{actualizados} órdenes actualizadas a ENTREGADO.")

    actions = [marcar_reparados, marcar_entregados]

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

# ==========================================
# 🛠️ NUEVO: Personalización de la Identidad del Panel
# ==========================================
admin.site.site_header = "Administración de MP Tech"
admin.site.site_title = "MP Tech Admin"
admin.site.index_title = "Panel de Control Principal"