import decimal
import json
import logging
import os

import requests
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.core.cache import cache
from django.core.paginator import Paginator
from django.db.models import Count, Prefetch, Q, Sum
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

logger = logging.getLogger(__name__)

TASA_CACHE_KEY = 'tasa_usdt_ves'
TASA_CACHE_TTL = 3600
FACTOR_AJUSTE_BCV = 1.20
TASA_FALLBACK = 760.00


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


def _fetch_tasa_coingecko():
    """Obtiene la tasa USDT/VES desde CoinGecko."""
    url = "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ves"
    headers = {"accept": "application/json"}

    api_key = os.environ.get('COINGECKO_API_KEY')
    if api_key:
        headers["x-cg-demo-api-key"] = api_key

    response = requests.get(url, headers=headers, timeout=5)
    response.raise_for_status()

    data = response.json()
    return float(data['tether']['ves'])


def _fetch_tasa_bcv():
    """Obtiene la tasa oficial BCV y aplica factor de ajuste."""
    url = "https://open.er-api.com/v6/latest/USD"
    response = requests.get(url, timeout=5)
    response.raise_for_status()

    data = response.json()
    tasa_bcv = float(data['rates']['VES'])
    return round(tasa_bcv * FACTOR_AJUSTE_BCV, 2)


def obtener_tasa_binance():
    """Obtiene la tasa de cambio USD/VE con fallback a API pública."""
    tasa = cache.get(TASA_CACHE_KEY)
    if tasa:
        return tasa

    fuentes = [
        ('CoinGecko', _fetch_tasa_coingecko),
        ('ExchangeRate-API', _fetch_tasa_bcv),
    ]

    for nombre, fetch_fn in fuentes:
        try:
            precio = fetch_fn()
            cache.set(TASA_CACHE_KEY, precio, TASA_CACHE_TTL)
            return precio
        except Exception as e:
            logger.warning("Falló %s: %s", nombre, e)

    fallback = cache.get(TASA_CACHE_KEY, TASA_FALLBACK)
    return fallback


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
# CARRITO DE COMPRAS (CATÁLOGO) - SESSION BASED
# ==============================================================================

def _obtener_datos_carrito(request):
    """Retorna los items del carrito y el total."""
    carrito = request.session.get('carrito', [])
    total = sum(item.get('precio', 0) * item.get('cantidad', 1) for item in carrito)
    return {'carrito': carrito, 'total_carrito': total, 'cantidad_items': len(carrito)}


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
def agregar_al_carrito(request):
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({'success': False, 'error': 'Datos JSON inválidos'}, status=400)

    producto_id = data.get('producto_id')
    cantidad = data.get('cantidad', 1)

    if not producto_id:
        return JsonResponse({'success': False, 'error': 'producto_id requerido'}, status=400)

    try:
        cantidad = int(cantidad)
        if cantidad <= 0:
            raise ValueError
    except (TypeError, ValueError):
        return JsonResponse({'success': False, 'error': 'Cantidad inválida'}, status=400)

    producto = get_object_or_404(Producto, pk=producto_id, disponible=True)

    if cantidad > producto.stock:
        return JsonResponse({
            'success': False,
            'error': f'Stock insuficiente. Disponible: {producto.stock}'
        })

    carrito = request.session.get('carrito', [])

    for item in carrito:
        if item['producto_id'] == producto_id:
            nueva_cant = item['cantidad'] + cantidad
            if nueva_cant > producto.stock:
                return JsonResponse({
                    'success': False,
                    'error': f'Stock insuficiente. Disponible: {producto.stock}'
                })
            item['cantidad'] = nueva_cant
            request.session['carrito'] = carrito
            return JsonResponse({'success': True, 'msg': 'Cantidad actualizada'})

    carrito.append(_serializar_producto(producto))
    carrito[-1]['cantidad'] = cantidad
    request.session['carrito'] = carrito
    return JsonResponse({'success': True, 'msg': 'Producto añadido al carrito'})


@require_POST
def actualizar_carrito(request):
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({'success': False, 'error': 'Datos JSON inválidos'}, status=400)

    producto_id = data.get('producto_id')
    cantidad = data.get('cantidad', 0)

    if not producto_id:
        return JsonResponse({'success': False, 'error': 'producto_id requerido'}, status=400)

    try:
        cantidad = int(cantidad)
    except (TypeError, ValueError):
        return JsonResponse({'success': False, 'error': 'Cantidad inválida'}, status=400)

    carrito = request.session.get('carrito', [])

    if cantidad <= 0:
        carrito = [item for item in carrito if item['producto_id'] != producto_id]
    else:
        for item in carrito:
            if item['producto_id'] == producto_id:
                if cantidad > item['stock']:
                    return JsonResponse({
                        'success': False,
                        'error': f'Stock máximo: {item["stock"]}'
                    })
                item['cantidad'] = cantidad
                break

    request.session['carrito'] = carrito
    info = _obtener_datos_carrito(request)
    return JsonResponse({
        'success': True,
        'cantidad_items': info['cantidad_items'],
        'total_carrito': info['total_carrito'],
    })


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

    total = sum(item['precio'] * item['cantidad'] for item in productos)

    pedido = PedidoCatalogo.objects.create(
        usuario=request.user if request.user.is_authenticated else None,
        cliente_nombre=cliente_nombre,
        cliente_telefono=cliente_telefono,
        total_usd=round(total, 2),
        productos_json=json.dumps(productos),
    )

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

    producto = get_object_or_404(Producto, pk=producto_id, disponible=True)
    item = _serializar_producto(producto)
    total = float(producto.precio)

    pedido = PedidoCatalogo.objects.create(
        usuario=request.user if request.user.is_authenticated else None,
        cliente_nombre=cliente_nombre,
        cliente_telefono=cliente_telefono,
        total_usd=round(total, 2),
        productos_json=json.dumps([item]),
    )

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
    return render(request, 'detalle_importacion.html', {'p': pedido})


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
    productos = (
        Producto.objects
        .filter(disponible=True)
        .select_related('categoria')
        .values('id', 'nombre', 'descripcion', 'precio', 'stock', 'categoria__nombre')
    )
    return JsonResponse(list(productos), safe=False)


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
