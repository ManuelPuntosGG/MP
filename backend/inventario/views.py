import decimal
import json
import logging

from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import Count, F, Prefetch, Sum
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, render
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt

from .forms import (
    EmailAuthenticationForm,
    EmailUserCreationForm,
    PerfilForm,
    SolicitudReparacionForm,
)
from .models import (
    AvanceOrden,
    Categoria,
    OrdenServicio,
    PedidoCatalogo,
    PedidoImportacion,
    Producto,
    UserProfile,
)
from .utils import obtener_tasa_binance

logger = logging.getLogger(__name__)


# ==============================================================================
# VISTAS INTERNAS DE DJANGO (No migradas a React)
# ==============================================================================

def imprimir_ticket(request, pk):
    """Vista de impresión térmica para técnicos. No aplica en React SPA."""
    orden = get_object_or_404(OrdenServicio, pk=pk)
    return render(request, 'imprimir_ticket.html', {'ticket': orden})


@login_required
def dashboard(request):
    """Panel de analíticas interno. Solo para personal de MP Tech."""
    return render(request, 'dashboard.html', {
        'total_productos': Producto.objects.count(),
        'total_ordenes': OrdenServicio.objects.count(),
        'ordenes_activas': OrdenServicio.objects.exclude(
            estado__in=['ENTREGADO', 'CANCELADO']
        ).count(),
        'stock_bajo': Producto.objects.filter(stock__lte=5, disponible=True).count(),
        'ordenes_por_estado': (
            OrdenServicio.objects
            .values('estado')
            .annotate(total=Count('id'))
            .order_by('estado')
        ),
        'categorias_count': Categoria.objects.annotate(
            total=Count('producto')
        ).order_by('-total'),
    })


# ==============================================================================
# CARRITO DE COMPRAS — UTILIDADES
# ==============================================================================

def _serializar_producto(producto):
    """Serializa un producto para el carrito."""
    return {
        'producto_id': producto.id,
        'nombre': producto.nombre,
        'precio': float(producto.precio),
        'cantidad': 1,
        'stock': producto.stock,
        'imagen': producto.imagen.url if producto.imagen else '',
    }


# ==============================================================================
# API REST — CATÁLOGO Y PRODUCTOS
# ==============================================================================

def api_productos(request):
    """Devuelve todos los productos disponibles con su categoría e imagen."""
    productos = Producto.objects.filter(disponible=True).select_related('categoria')
    data = []
    for p in productos:
        data.append({
            'id': p.id,
            'nombre': p.nombre,
            'descripcion': p.descripcion,
            'precio': str(p.precio),
            'stock': p.stock,
            'categoria_id': p.categoria.id if p.categoria else None,
            'categoria__nombre': p.categoria.nombre if p.categoria else None,
            'imagen': p.imagen.url if p.imagen else None,
        })
    return JsonResponse(data, safe=False)


def api_categorias(request):
    """Devuelve todas las categorías de productos."""
    categorias = Categoria.objects.values('id', 'nombre')
    return JsonResponse(list(categorias), safe=False)


def api_tasa(request):
    """Devuelve la tasa de cambio USD→VES desde Binance P2P."""
    try:
        tasa = float(obtener_tasa_binance())
    except Exception:
        tasa = 760.00  # Fallback en caso de error de conexión
    return JsonResponse({'tasa_ves': tasa})


# ==============================================================================
# API REST — CARRITO DE CATÁLOGO
# ==============================================================================

@csrf_exempt
@require_POST
def finalizar_pedido_catalogo(request):
    """Procesa el checkout del carrito de catálogo desde React."""
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        data = request.POST

    productos = data.get('productos', [])
    if not productos:
        return JsonResponse({'success': False, 'error': 'Carrito vacío'}, status=400)

    cliente_nombre = data.get('nombre', '').strip()
    cliente_telefono = data.get('telefono', '').strip()

    if not cliente_nombre:
        return JsonResponse({'success': False, 'error': 'Nombre requerido'}, status=400)

    try:
        total = sum(float(item['precio']) * int(item['cantidad']) for item in productos)
    except (KeyError, ValueError, TypeError):
        return JsonResponse({'success': False, 'error': 'Montos o cantidades inválidas'}, status=400)

    try:
        with transaction.atomic():
            for item in productos:
                try:
                    prod_id = int(item['producto_id'])
                    cantidad = int(item['cantidad'])
                except (KeyError, ValueError, TypeError):
                    return JsonResponse({'success': False, 'error': 'Datos de producto inválidos'}, status=400)

                try:
                    producto = Producto.objects.select_for_update().get(pk=prod_id, disponible=True)
                except Producto.DoesNotExist:
                    return JsonResponse({
                        'success': False,
                        'error': f"El producto '{item.get('nombre', 'Desconocido')}' no está disponible o no existe."
                    }, status=400)

                if producto.stock < cantidad:
                    return JsonResponse({
                        'success': False,
                        'error': f"Stock insuficiente para '{producto.nombre}'. Disponible: {producto.stock}."
                    }, status=400)

                producto.stock = F('stock') - cantidad
                producto.save()

            pedido = PedidoCatalogo.objects.create(
                usuario=request.user if request.user.is_authenticated else None,
                cliente_nombre=cliente_nombre,
                cliente_telefono=cliente_telefono,
                total_usd=round(total, 2),
                productos_json=json.dumps(productos),
            )
    except Exception as e:
        logger.error("Error al procesar el pedido de catálogo: %s", e)
        return JsonResponse({'success': False, 'error': 'Error interno al procesar el pedido'}, status=500)

    return JsonResponse({
        'success': True,
        'codigo': pedido.codigo_seguimiento,
        'total': round(total, 2),
    })


@require_POST
def comprar_producto(request, producto_id):
    """Compra directa de un producto individual desde React."""
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        data = request.POST

    cliente_nombre = data.get('nombre', '').strip()
    cliente_telefono = data.get('telefono', '').strip()

    if not cliente_nombre:
        return JsonResponse({'success': False, 'error': 'Nombre requerido'}, status=400)

    try:
        with transaction.atomic():
            producto = get_object_or_404(Producto.objects.select_for_update(), pk=producto_id, disponible=True)

            if producto.stock < 1:
                return JsonResponse({
                    'success': False,
                    'error': f"Stock insuficiente para '{producto.nombre}'. Producto agotado."
                }, status=400)

            producto.stock = F('stock') - 1
            producto.save()

            item = _serializar_producto(producto)
            total = float(producto.precio)

            pedido = PedidoCatalogo.objects.create(
                usuario=request.user if request.user.is_authenticated else None,
                cliente_nombre=cliente_nombre,
                cliente_telefono=cliente_telefono,
                total_usd=round(total, 2),
                productos_json=json.dumps([item]),
            )
    except Exception as e:
        logger.error("Error al procesar la compra directa: %s", e)
        return JsonResponse({'success': False, 'error': 'Error interno al procesar la compra'}, status=500)

    return JsonResponse({
        'success': True,
        'codigo': pedido.codigo_seguimiento,
        'total': round(total, 2),
        'producto_nombre': producto.nombre,
    })


# ==============================================================================
# API REST — IMPORTACIONES
# ==============================================================================

@csrf_exempt
@require_POST
def api_guardar_importacion(request):
    """Guarda un pedido de importación enviado desde React."""
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({'success': False, 'error': 'Datos JSON inválidos'}, status=400)

    productos = data.get('productos', [])
    if not productos:
        return JsonResponse({'success': False, 'error': 'Productos requeridos'}, status=400)

    cliente_nombre = data.get('nombre', '').strip()
    if not cliente_nombre:
        return JsonResponse({'success': False, 'error': 'Nombre requerido'}, status=400)

    try:
        total_usd = float(data.get('total_usd', 0))
        total_ves = float(data.get('total_ves', 0))
    except (TypeError, ValueError):
        return JsonResponse({'success': False, 'error': 'Montos inválidos'}, status=400)

    with transaction.atomic():
        pedido = PedidoImportacion.objects.create(
            usuario=request.user if request.user.is_authenticated else None,
            cliente_nombre=cliente_nombre,
            cliente_telefono=data.get('telefono', '').strip(),
            total_usd=round(total_usd, 2),
            total_ves=round(total_ves, 2),
            productos_json=json.dumps(productos),
            nota=data.get('nota', '').strip(),
        )

    return JsonResponse({'success': True, 'codigo': pedido.codigo_seguimiento})


def api_importacion_detalle(request, codigo):
    """Devuelve el detalle completo de un pedido de importación por código."""
    pedido = get_object_or_404(PedidoImportacion, codigo_seguimiento=codigo)

    if pedido.usuario and pedido.usuario != request.user:
        return JsonResponse({'error': 'No autorizado'}, status=403)

    pago_activo = pedido.pagos.filter(estado__in=['PENDIENTE', 'VERIFICADO']).order_by('-fecha_registro').first()
    estado_pago = pago_activo.estado if pago_activo else None

    return JsonResponse({
        'codigo': pedido.codigo_seguimiento,
        'fecha': pedido.fecha.isoformat(),
        'cliente_nombre': pedido.cliente_nombre or (pedido.usuario.nombre_completo if pedido.usuario else "Cliente"),
        'estado_raw': pedido.estado,
        'estado': pedido.get_estado_display(),
        'total_usd': float(pedido.total_usd),
        'total_ves': float(pedido.total_ves),
        'productos': json.loads(pedido.productos_json),
        'nota': pedido.nota,
        'carrier_nombre': pedido.carrier_nombre,
        'carrier_tracking': pedido.carrier_tracking,
        'tasa_confirmacion': float(pedido.tasa_confirmacion) if pedido.tasa_confirmacion else None,
        'tasa_entrega': float(pedido.tasa_entrega) if pedido.tasa_entrega else None,
        'pago_inicial_usd_estimado': float(pedido.pago_inicial_usd_estimado),
        'pago_inicial_ves': float(pedido.pago_inicial_ves) if pedido.pago_inicial_ves else None,
        'saldo_pendiente_usd_estimado': float(pedido.saldo_pendiente_usd_estimado),
        'saldo_pendiente_ves': float(pedido.saldo_pendiente_ves) if pedido.saldo_pendiente_ves else None,
        'estado_pago': estado_pago,
    })


# ==============================================================================
# API REST — ÓRDENES DE SERVICIO (RASTREO)
# ==============================================================================

def api_ordenes(request, codigo=None):
    """Busca y devuelve una orden de servicio por su código de rastreo."""
    if not codigo:
        return JsonResponse({'error': 'Código de orden requerido'}, status=400)

    try:
        orden = (
            OrdenServicio.objects
            .prefetch_related(
                Prefetch('lineas_presupuesto'),
                Prefetch('avances'),
            )
            .get(codigo_rastreo=codigo)
        )
    except OrdenServicio.DoesNotExist:
        return JsonResponse({'error': 'Orden no encontrada'}, status=404)

    # Calcular totales del presupuesto
    total_usd = decimal.Decimal('0.00')
    if orden.presupuesto_estado != 'SIN_PRESUPUESTO':
        resultado = orden.lineas_presupuesto.aggregate(total=Sum('monto'))
        total_usd = resultado['total'] or decimal.Decimal('0.00')

    try:
        tasa_usdt = float(obtener_tasa_binance())
    except Exception:
        tasa_usdt = 760.00
    total_ves = total_usd * decimal.Decimal(str(tasa_usdt))

    # Formatear avances con imágenes adjuntas
    avances_data = []
    for av in orden.avances.all():
        avances_data.append({
            'fecha': av.fecha.isoformat(),
            'descripcion': av.descripcion,
            'imagen': av.imagen.url if av.imagen else None
        })

    pago_activo = orden.pagos.filter(estado__in=['PENDIENTE', 'VERIFICADO']).order_by('-fecha_registro').first()
    estado_pago = pago_activo.estado if pago_activo else None

    return JsonResponse({
        'id': orden.pk,
        'codigo': orden.codigo_rastreo,
        'cliente': orden.cliente_nombre,
        'equipo': orden.equipo,
        'estado_raw': orden.estado,
        'estado': orden.get_estado_display(),
        'presupuesto_estado_raw': orden.presupuesto_estado,
        'presupuesto_estado': orden.get_presupuesto_estado_display(),
        'falla_reportada': orden.falla_reportada,
        'fecha_ingreso': orden.fecha_ingreso.isoformat(),
        'lineas_presupuesto': list(orden.lineas_presupuesto.values('concepto', 'monto')),
        'avances': avances_data,
        'total_usd': float(total_usd),
        'total_ves': float(total_ves),
        'tasa_ves': tasa_usdt,
        'estado_pago': estado_pago
    })


@csrf_exempt
def api_solicitar_reparacion(request):
    """Crea una nueva orden de servicio de reparación desde React."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)

    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({'error': 'JSON inválido'}, status=400)

    form = SolicitudReparacionForm(data)
    if form.is_valid():
        nueva_orden = form.save(commit=False)
        if request.user.is_authenticated:
            nueva_orden.usuario = request.user
        nueva_orden.save()

        return JsonResponse({
            'success': True,
            'codigo': nueva_orden.codigo_rastreo,
            'cliente_nombre': nueva_orden.cliente_nombre,
            'equipo': nueva_orden.equipo,
        })
    else:
        errors = {field: errs[0] for field, errs in form.errors.items()}
        return JsonResponse({'error': 'Datos inválidos', 'errors': errors}, status=400)


@csrf_exempt
def api_responder_presupuesto(request):
    """Procesa la aprobación o rechazo de un presupuesto desde React."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)

    try:
        data = json.loads(request.body)
        codigo = data.get('codigo')
        accion = data.get('accion')
    except Exception:
        return JsonResponse({'error': 'JSON inválido'}, status=400)

    if not codigo or not accion:
        return JsonResponse({'error': 'Faltan parámetros'}, status=400)

    orden = get_object_or_404(OrdenServicio, codigo_rastreo=codigo)

    if accion == 'aprobar':
        orden.presupuesto_estado = 'APROBADO'
        orden.estado = 'REPUESTOS'
        AvanceOrden.objects.create(
            orden=orden,
            descripcion="✅ Presupuesto aprobado. Iniciando proceso de reparación."
        )
    elif accion == 'rechazar':
        orden.presupuesto_estado = 'RECHAZADO'
        orden.estado = 'CANCELADO'
        AvanceOrden.objects.create(
            orden=orden,
            descripcion="❌ Presupuesto rechazado. Equipo en espera de retiro."
        )
    else:
        return JsonResponse({'error': 'Acción no válida'}, status=400)

    orden.save()
    return JsonResponse({'success': True})


# ==============================================================================
# API REST — AUTENTICACIÓN Y PERFIL
# ==============================================================================

@csrf_exempt
def api_login(request):
    """Inicia sesión de un usuario desde React y devuelve sus datos de perfil."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        data = request.POST

    form = EmailAuthenticationForm(request, data=data)
    if form.is_valid():
        user = form.get_user()
        login(request, user, backend='inventario.auth_backend.EmailBackend')
        try:
            nombre = user.perfil.nombre_completo
            telefono = user.perfil.telefono
        except UserProfile.DoesNotExist:
            nombre = ""
            telefono = ""
        return JsonResponse({
            'success': True,
            'user': {
                'email': user.email,
                'nombre_completo': nombre,
                'telefono': telefono
            }
        })
    else:
        error_msg = form.errors.get('__all__', ['Credenciales inválidas'])[0]
        return JsonResponse({'success': False, 'error': error_msg}, status=400)


@csrf_exempt
def api_register(request):
    """Registra un nuevo usuario desde React."""
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        data = request.POST

    form = EmailUserCreationForm(data)
    if form.is_valid():
        user = form.save()
        login(request, user, backend='inventario.auth_backend.EmailBackend')
        return JsonResponse({
            'success': True,
            'user': {
                'email': user.email,
                'nombre_completo': '',
                'telefono': data.get('telefono', '')
            }
        })
    else:
        errors = {field: msgs[0] for field, msgs in form.errors.items()}
        return JsonResponse({'success': False, 'errors': errors}, status=400)


@csrf_exempt
def api_logout(request):
    """Cierra la sesión del usuario actual desde React."""
    logout(request)
    return JsonResponse({'success': True})


def api_user(request):
    """Devuelve el usuario autenticado, su perfil y todo su historial."""
    if not request.user.is_authenticated:
        return JsonResponse({'authenticated': False})

    user = request.user
    try:
        nombre = user.perfil.nombre_completo
        telefono = user.perfil.telefono
    except UserProfile.DoesNotExist:
        nombre = ""
        telefono = ""

    try:
        tasa_usdt = float(obtener_tasa_binance())
    except Exception:
        tasa_usdt = 760.00

    # Pedidos de catálogo
    pedidos_qs = PedidoCatalogo.objects.filter(usuario=user).order_by('-fecha')
    pedidos = []
    for p in pedidos_qs:
        pago_activo = p.pagos.filter(estado__in=['PENDIENTE', 'VERIFICADO']).order_by('-fecha_registro').first()
        total_usd = float(p.total_usd)
        pedidos.append({
            'codigo': p.codigo_seguimiento,
            'fecha': p.fecha.isoformat(),
            'total': total_usd,
            'total_ves': total_usd * tasa_usdt,
            'productos': json.loads(p.productos_json),
            'estado_raw': p.estado,
            'estado': p.get_estado_display(),
            'estado_pago': pago_activo.estado if pago_activo else None,
        })

    # Reparaciones (Órdenes de Servicio)
    ordenes_qs = OrdenServicio.objects.filter(usuario=user).order_by('-fecha_ingreso')
    ordenes = [{
        'codigo': o.codigo_rastreo,
        'equipo': o.equipo,
        'falla': o.falla_reportada,
        'estado': o.get_estado_display(),
        'fecha_ingreso': o.fecha_ingreso.isoformat()
    } for o in ordenes_qs]

    # Importaciones
    importaciones_qs = PedidoImportacion.objects.filter(usuario=user).order_by('-fecha')
    importaciones = [{
        'codigo': i.codigo_seguimiento,
        'fecha': i.fecha.isoformat(),
        'total_usd': float(i.total_usd),
        'total_ves': float(i.total_ves),
        'productos': json.loads(i.productos_json)
    } for i in importaciones_qs]

    return JsonResponse({
        'authenticated': True,
        'user': {
            'email': user.email,
            'nombre_completo': nombre,
            'telefono': telefono
        },
        'pedidos_catalogo': pedidos,
        'ordenes': ordenes,
        'importaciones': importaciones
    })


@csrf_exempt
def api_editar_perfil(request):
    """Actualiza los datos de perfil del usuario autenticado desde React."""
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'No autorizado'}, status=401)

    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        data = request.POST

    form = PerfilForm(data, instance=request.user)
    if form.is_valid():
        form.save()
        return JsonResponse({'success': True})
    else:
        errors = {field: msgs[0] for field, msgs in form.errors.items()}
        return JsonResponse({'success': False, 'errors': errors}, status=400)


@csrf_exempt
def api_registrar_pago(request):
    """
    Registra un pago reportado por el cliente desde el modal de React.
    Espera un JSON con:
    - tipo_orden ('servicio', 'importacion', 'catalogo')
    - codigo_orden
    - monto_usd
    - monto_ves (opcional)
    - metodo
    - fecha
    - referencia
    - concepto
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)

    try:
        data = json.loads(request.body)
    except ValueError:
        return JsonResponse({'error': 'JSON inválido'}, status=400)

    tipo_orden = data.get('tipo_orden')
    codigo_orden = data.get('codigo_orden')
    
    # Preparamos los kwargs para el pago
    pago_kwargs = {
        'monto_usd': data.get('monto_usd'),
        'monto_ves': data.get('monto_ves') or None,
        'metodo': data.get('metodo'),
        'fecha_pago': data.get('fecha') or None,
        'referencia': data.get('referencia', ''),
        'concepto': data.get('concepto', 'Abono/Pago'),
        'estado': 'PENDIENTE'
    }

    try:
        if tipo_orden == 'servicio':
            orden = OrdenServicio.objects.get(codigo_rastreo=codigo_orden)
            pago_kwargs['orden_servicio'] = orden
        elif tipo_orden == 'importacion':
            orden = PedidoImportacion.objects.get(codigo_seguimiento=codigo_orden)
            pago_kwargs['pedido_importacion'] = orden
        elif tipo_orden == 'catalogo':
            orden = PedidoCatalogo.objects.get(codigo_seguimiento=codigo_orden)
            pago_kwargs['pedido_catalogo'] = orden
        else:
            return JsonResponse({'error': 'Tipo de orden desconocido'}, status=400)

        # Crear el pago
        from .models import Pago
        Pago.objects.create(**pago_kwargs)

        return JsonResponse({'success': True, 'message': 'Pago registrado exitosamente'})
        
    except (OrdenServicio.DoesNotExist, PedidoImportacion.DoesNotExist, PedidoCatalogo.DoesNotExist):
        return JsonResponse({'error': 'Orden o Pedido no encontrado'}, status=404)
    except Exception as e:
        logger.error(f"Error al registrar pago: {e}")
        return JsonResponse({'error': str(e)}, status=500)
