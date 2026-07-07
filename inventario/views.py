import decimal
import json
import logging

from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Count, F, Prefetch, Q, Sum
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.views.decorators.http import require_POST

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


def _obtener_perfil_inicial(usuario):
    """Extrae datos del perfil del usuario para prellenar formularios."""
    initial = {}
    try:
        perfil = usuario.perfil
        initial['cliente_nombre'] = (
            perfil.nombre_completo
            or usuario.get_full_name()
            or usuario.email.split('@')[0]
        )
        if perfil.telefono:
            initial['cliente_telefono'] = perfil.telefono
    except UserProfile.DoesNotExist:
        initial['cliente_nombre'] = (
            usuario.get_full_name() or usuario.email.split('@')[0]
        )
    return initial


def inicio(request):
    context = {}
    if request.user.is_authenticated:
        user = request.user
        context['ordenes'] = (
            OrdenServicio.objects
            .filter(usuario=user)
            .order_by('-fecha_ingreso')[:5]
        )
        context['importaciones'] = (
            PedidoImportacion.objects
            .filter(usuario=user)
            .order_by('-fecha')[:5]
        )
        context['pedidos_catalogo'] = (
            PedidoCatalogo.objects
            .filter(usuario=user)
            .order_by('-fecha')[:5]
        )
    return render(request, 'inicio.html', context)


def imprimir_ticket(request, pk):
    orden = get_object_or_404(OrdenServicio, pk=pk)
    return render(request, 'imprimir_ticket.html', {'ticket': orden})



def rastrear_orden(request):
    initial = _obtener_perfil_inicial(request.user) if request.user.is_authenticated else {}
    form = SolicitudReparacionForm(initial=initial)
    ticket = None
    error = None
    total_usd = decimal.Decimal('0.00')
    total_ves = decimal.Decimal('0.00')
    codigo = request.GET.get('codigo', '').strip().upper()

    if codigo:
        try:
            ticket = (
                OrdenServicio.objects
                .prefetch_related(
                    Prefetch('lineas_presupuesto'),
                    Prefetch('avances'),
                )
                .get(codigo_rastreo=codigo)
            )

            if ticket.presupuesto_estado != 'SIN_PRESUPUESTO':
                resultado = ticket.lineas_presupuesto.aggregate(total=Sum('monto'))
                total_usd = resultado['total'] or decimal.Decimal('0.00')
                tasa_usdt = obtener_tasa_binance()
                total_ves = total_usd * decimal.Decimal(str(tasa_usdt))

        except OrdenServicio.DoesNotExist:
            error = f"No se encontró ninguna orden con el código {codigo}."

    return render(request, 'rastreo.html', {
        'form': form,
        'ticket': ticket,
        'error': error,
        'codigo': codigo,
        'total_usd': total_usd,
        'total_ves': total_ves,
    })


def solicitar_reparacion(request):
    initial = _obtener_perfil_inicial(request.user) if request.user.is_authenticated else {}

    if request.method == 'POST':
        form = SolicitudReparacionForm(request.POST)
        if form.is_valid():
            nueva_orden = form.save(commit=False)
            if request.user.is_authenticated:
                nueva_orden.usuario = request.user
            nueva_orden.save()

            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': True,
                    'codigo': nueva_orden.codigo_rastreo,
                    'cliente_nombre': nueva_orden.cliente_nombre,
                    'equipo': nueva_orden.equipo,
                })
            return render(request, 'exito_solicitud.html', {'orden': nueva_orden})
    else:
        form = SolicitudReparacionForm(initial=initial)

    return render(request, 'rastreo.html', {'form': form})


def catalogo(request):
    productos_qs = Producto.objects.filter(disponible=True).select_related('categoria')

    query_busqueda = request.GET.get('q', '').strip()
    categoria_id = request.GET.get('categoria', '')

    if query_busqueda:
        productos_qs = productos_qs.filter(
            Q(nombre__icontains=query_busqueda) |
            Q(descripcion__icontains=query_busqueda)
        )

    if categoria_id and categoria_id.isdigit():
        productos_qs = productos_qs.filter(categoria_id=int(categoria_id))

    paginator = Paginator(productos_qs, 20)
    page_obj = paginator.get_page(request.GET.get('page'))

    tasa_usdt = obtener_tasa_binance()
    tasa_decimal = decimal.Decimal(str(tasa_usdt))

    for producto in page_obj:
        producto.precio_ves = producto.precio * tasa_decimal

    return render(request, 'catalogo.html', {
        'page_obj': page_obj,
        'categorias': Categoria.objects.all(),
        'query_busqueda': query_busqueda,
        'categoria_seleccionada': int(categoria_id) if (categoria_id and categoria_id.isdigit()) else None,
        'tasa_ves': tasa_usdt,
    })


@require_POST
def responder_presupuesto(request, pk, accion):
    """Procesa la aprobación o rechazo del presupuesto por el cliente."""
    orden = get_object_or_404(OrdenServicio, pk=pk)

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
    return redirect(reverse('inventario:rastrear_ticket') + f"?codigo={orden.codigo_rastreo}")


def cotizador_auto(request):
    tasa_actual = obtener_tasa_binance()
    return render(request, 'importaciones.html', {'tasa_ves': tasa_actual})


# ==============================================================================
# AUTENTICACIÓN DE CLIENTES
# ==============================================================================

def registrar_cliente(request):
    if request.method == 'POST':
        form = EmailUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user, backend='inventario.auth_backend.EmailBackend')
            return redirect('inventario:perfil_cliente')
    else:
        form = EmailUserCreationForm()
    return render(request, 'registro.html', {'form': form})


def iniciar_sesion(request):
    if request.method == 'POST':
        form = EmailAuthenticationForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user, backend='inventario.auth_backend.EmailBackend')

            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': True})

            next_url = request.GET.get('next', reverse('inventario:perfil_cliente'))
            return redirect(next_url)

        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            error_msg = form.errors.get('__all__', ['Credenciales inválidas'])[0]
            return JsonResponse({'success': False, 'error': error_msg}, status=400)
    else:
        form = EmailAuthenticationForm()

    return render(request, 'login.html', {'form': form})


def cerrar_sesion(request):
    logout(request)
    return redirect('inventario:inicio')


@login_required
def perfil_cliente(request):
    user = request.user
    return render(request, 'perfil.html', {
        'ordenes': OrdenServicio.objects.filter(usuario=user).order_by('-fecha_ingreso'),
        'importaciones': PedidoImportacion.objects.filter(usuario=user).order_by('-fecha'),
        'pedidos_catalogo': PedidoCatalogo.objects.filter(usuario=user).order_by('-fecha'),
    })


@login_required
def perfil_editar(request):
    perfil, _ = UserProfile.objects.get_or_create(usuario=request.user)

    if request.method == 'POST':
        form = PerfilForm(request.POST, instance=request.user)
        if form.is_valid():
            form.save()
            return redirect('inventario:perfil_cliente')
    else:
        form = PerfilForm(instance=request.user)

    return render(request, 'perfil_editar.html', {'form': form})


# ==============================================================================
# CARRITO DE COMPRAS (CATÁLOGO) - UTILS
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


@require_POST
def finalizar_pedido_catalogo(request):
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
# PEDIDOS DE IMPORTACIÓN
# ==============================================================================

@require_POST
def guardar_pedido_importacion(request):
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


def detalle_importacion(request, pk):
    pedido = get_object_or_404(PedidoImportacion, pk=pk)
    tasa_actual = obtener_tasa_binance()
    return render(request, 'detalle_importacion.html', {
        'p': pedido,
        'tasa_actual': tasa_actual
    })


# ==============================================================================
# DASHBOARD Y ANALÍTICAS
# ==============================================================================

@login_required
def dashboard(request):
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
# API REST BÁSICA
# ==============================================================================

def api_productos(request):
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
    categorias = Categoria.objects.values('id', 'nombre')
    return JsonResponse(list(categorias), safe=False)

def api_tasa(request):
    from .utils import obtener_tasa_binance
    tasa = obtener_tasa_binance()
    return JsonResponse({'tasa_ves': tasa})

def api_ordenes(request, codigo=None):
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

    return JsonResponse({
        'codigo': orden.codigo_rastreo,
        'cliente': orden.cliente_nombre,
        'equipo': orden.equipo,
        'estado': orden.get_estado_display(),
        'presupuesto_estado': orden.get_presupuesto_estado_display(),
        'fecha_ingreso': orden.fecha_ingreso.isoformat(),
        'lineas_presupuesto': list(orden.lineas_presupuesto.values('concepto', 'monto')),
        'avances': list(orden.avances.values('fecha', 'descripcion')),
    })
