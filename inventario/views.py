import decimal
import os
import json
import requests
from django.core.cache import cache
from django.shortcuts import render, redirect, get_object_or_404
from django.core.paginator import Paginator
from django.db.models import Q, Sum, Prefetch, Count
from django.views.decorators.http import require_POST
from django.urls import reverse
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
import json

from .forms import SolicitudReparacionForm, EmailUserCreationForm, EmailAuthenticationForm, PerfilForm
from .models import Categoria, Producto, OrdenServicio, AvanceOrden, PedidoImportacion, PedidoCatalogo, UserProfile 


def inicio(request):
    return render(request, 'inicio.html')


def imprimir_ticket(request, pk):
    orden = get_object_or_404(OrdenServicio, pk=pk)
    return render(request, 'imprimir_ticket.html', {'ticket': orden})


def obtener_tasa_binance():
    tasa = cache.get('tasa_usdt_ves')
    if tasa:
        return tasa

    try:
        url_coingecko = "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ves"
        COINGECKO_KEY = os.environ.get('COINGECKO_API_KEY')
        
        headers = {
            "accept": "application/json",
        }
        if COINGECKO_KEY:
            headers["x-cg-demo-api-key"] = COINGECKO_KEY
        
        response = requests.get(url_coingecko, headers=headers, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if 'tether' in data and 'ves' in data['tether']:
                precio = float(data['tether']['ves'])
                cache.set('tasa_usdt_ves', precio, 3600)
                return precio
    except Exception as error_api:
        print(f"Falló CoinGecko: {error_api}")

    try:
        url_exchangerate = "https://open.er-api.com/v6/latest/USD"
        response = requests.get(url_exchangerate, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if 'rates' in data and 'VES' in data['rates']:
                tasa_bcv = float(data['rates']['VES'])
                FACTOR_AJUSTE = 1.20
                precio = round(tasa_bcv * FACTOR_AJUSTE, 2)
                
                cache.set('tasa_usdt_ves', precio, 3600)
                return precio
    except Exception as error_global:
        print(f"Falló ExchangeRate-API: {error_global}")

    fallback = cache.get('tasa_usdt_ves', 760.00)
    return fallback


def rastrear_orden(request):
    initial = {}
    if request.user.is_authenticated:
        try:
            perfil = request.user.perfil
            initial['cliente_nombre'] = perfil.nombre_completo or request.user.get_full_name() or request.user.email.split('@')[0]
            if perfil.telefono:
                initial['cliente_telefono'] = perfil.telefono
        except Exception:
            initial['cliente_nombre'] = request.user.get_full_name() or request.user.email.split('@')[0]
    form = SolicitudReparacionForm(initial=initial)
    ticket = None
    error = None
    total_usd = decimal.Decimal('0.00')
    total_ves = decimal.Decimal('0.00')
    codigo = request.GET.get('codigo', '').strip().upper()

    if codigo:
        try:
            ticket = OrdenServicio.objects.prefetch_related(
                Prefetch('lineas_presupuesto'),
                Prefetch('avances')
            ).get(codigo_rastreo=codigo)
            
            if ticket.presupuesto_estado != 'SIN_PRESUPUESTO':
                resultado = ticket.lineas_presupuesto.aggregate(total=Sum('monto'))
                total_usd = resultado['total'] or decimal.Decimal('0.00')
                
                tasa_usdt = obtener_tasa_binance()
                tasa_decimal = decimal.Decimal(str(tasa_usdt))
                total_ves = total_usd * tasa_decimal
                
        except OrdenServicio.DoesNotExist:
            error = f"No se encontró ninguna orden con el código {codigo}."

    contexto = {
        'form': form,
        'ticket': ticket,
        'error': error,
        'codigo': codigo,
        'total_usd': total_usd,
        'total_ves': total_ves
    }
    return render(request, 'rastreo.html', contexto)


def solicitar_reparacion(request):
    initial = {}
    if request.user.is_authenticated:
        try:
            perfil = request.user.perfil
            initial['cliente_nombre'] = perfil.nombre_completo or request.user.get_full_name() or request.user.email.split('@')[0]
            if perfil.telefono:
                initial['cliente_telefono'] = perfil.telefono
        except Exception:
            initial['cliente_nombre'] = request.user.get_full_name() or request.user.email.split('@')[0]

    if request.method == 'POST':
        form = SolicitudReparacionForm(request.POST)
        if form.is_valid():
            nueva_orden = form.save(commit=False)
            if request.user.is_authenticated:
                nueva_orden.usuario = request.user
            nueva_orden.save()
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
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    tasa_usdt = obtener_tasa_binance()
    tasa_decimal = decimal.Decimal(str(tasa_usdt)) # Convertir a str primero previene errores de precisión flotante
    
    for producto in page_obj:
        producto.precio_ves = producto.precio * tasa_decimal

    categorias = Categoria.objects.all()
    
    contexto = {
        'page_obj': page_obj,
        'categorias': categorias,
        'query_busqueda': query_busqueda,
        'categoria_seleccionada': int(categoria_id) if (categoria_id and categoria_id.isdigit()) else None,
        'tasa_ves': tasa_usdt 
    }
    
    return render(request, 'catalogo.html', contexto)


@require_POST
def responder_presupuesto(request, pk, accion):
    """Recibe la interacción del cliente desde la web de rastreo"""
    orden = get_object_or_404(OrdenServicio, pk=pk)
    
    if accion == 'aprobar':
        orden.presupuesto_estado = 'APROBADO'
        orden.estado = 'REPUESTOS' 
        
        AvanceOrden.objects.create(
            orden=orden,
            descripcion="✅ Se ha aprobado el presupuesto. Iniciando proceso de reparación técnica."
        )
    elif accion == 'rechazar':
        orden.presupuesto_estado = 'RECHAZADO'
        orden.estado = 'CANCELADO' 
        
        AvanceOrden.objects.create(
            orden=orden,
            descripcion="❌ Presupuesto rechazado. Equipo en espera de retiro."
        )
        
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
            next_url = request.GET.get('next', reverse('inventario:perfil_cliente'))
            return redirect(next_url)
    else:
        form = EmailAuthenticationForm()
    return render(request, 'login.html', {'form': form})


def cerrar_sesion(request):
    logout(request)
    return redirect('inventario:inicio')


@login_required
def perfil_cliente(request):
    ordenes = OrdenServicio.objects.filter(usuario=request.user).order_by('-fecha_ingreso')
    importaciones = PedidoImportacion.objects.filter(usuario=request.user).order_by('-fecha')
    pedidos_catalogo = PedidoCatalogo.objects.filter(usuario=request.user).order_by('-fecha')
    return render(request, 'perfil.html', {
        'ordenes': ordenes,
        'importaciones': importaciones,
        'pedidos_catalogo': pedidos_catalogo,
    })


@login_required
def perfil_editar(request):
    perfil, created = UserProfile.objects.get_or_create(usuario=request.user)

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

def carrito_data(request):
    carrito = request.session.get('carrito', [])
    total = sum(item.get('precio', 0) * item.get('cantidad', 1) for item in carrito)
    return {'carrito': carrito, 'total_carrito': total, 'cantidad_items': len(carrito)}


def agregar_al_carrito(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        producto_id = data.get('producto_id')
        cantidad = int(data.get('cantidad', 1))

        producto = get_object_or_404(Producto, pk=producto_id, disponible=True)
        if cantidad > producto.stock:
            return JsonResponse({'success': False, 'error': f'Stock insuficiente. Disponible: {producto.stock}'})

        carrito = request.session.get('carrito', [])
        for item in carrito:
            if item['producto_id'] == producto_id:
                nueva_cant = item['cantidad'] + cantidad
                if nueva_cant > producto.stock:
                    return JsonResponse({'success': False, 'error': f'Stock insuficiente. Disponible: {producto.stock}'})
                item['cantidad'] = nueva_cant
                request.session['carrito'] = carrito
                return JsonResponse({'success': True, 'msg': 'Cantidad actualizada en el carrito'})

        carrito.append({
            'producto_id': producto_id,
            'nombre': producto.nombre,
            'precio': float(producto.precio),
            'cantidad': cantidad,
            'stock': producto.stock,
            'imagen': producto.imagen.url if producto.imagen else '',
        })
        request.session['carrito'] = carrito
        return JsonResponse({'success': True, 'msg': 'Producto añadido al carrito'})
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)


def actualizar_carrito(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        producto_id = data.get('producto_id')
        cantidad = int(data.get('cantidad', 0))
        carrito = request.session.get('carrito', [])

        if cantidad <= 0:
            carrito = [item for item in carrito if item['producto_id'] != producto_id]
        else:
            for item in carrito:
                if item['producto_id'] == producto_id:
                    if cantidad > item['stock']:
                        return JsonResponse({'success': False, 'error': f'Stock máximo: {item["stock"]}'})
                    item['cantidad'] = cantidad
                    break

        request.session['carrito'] = carrito
        info = carrito_data(request)
        return JsonResponse({'success': True, 'cantidad_items': info['cantidad_items'], 'total_carrito': info['total_carrito']})
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)


def finalizar_pedido_catalogo(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            data = request.POST

        productos = data.get('productos', [])
        if not productos:
            return JsonResponse({'success': False, 'error': 'Carrito vacío'})

        total = sum(item['precio'] * item['cantidad'] for item in productos)
        productos_json = json.dumps(productos)

        pedido = PedidoCatalogo.objects.create(
            usuario=request.user if request.user.is_authenticated else None,
            cliente_nombre=data.get('nombre', ''),
            cliente_telefono=data.get('telefono', ''),
            total_usd=round(total, 2),
            productos_json=productos_json,
        )

        return JsonResponse({
            'success': True,
            'codigo': pedido.codigo_seguimiento,
            'total': round(total, 2)
        })
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)


def comprar_producto(request, producto_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        data = request.POST

    producto = get_object_or_404(Producto, pk=producto_id, disponible=True)

    item = {
        'producto_id': producto.id,
        'nombre': producto.nombre,
        'precio': float(producto.precio),
        'cantidad': 1,
        'stock': producto.stock,
        'imagen': producto.imagen.url if producto.imagen else '',
    }
    total = float(producto.precio)

    pedido = PedidoCatalogo.objects.create(
        usuario=request.user if request.user.is_authenticated else None,
        cliente_nombre=data.get('nombre', ''),
        cliente_telefono=data.get('telefono', ''),
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

def guardar_pedido_importacion(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            productos = data.get('productos', [])
            total_usd = float(data.get('total_usd', 0))
            total_ves = float(data.get('total_ves', 0))

            pedido = PedidoImportacion.objects.create(
                usuario=request.user if request.user.is_authenticated else None,
                cliente_nombre=data.get('nombre', ''),
                cliente_telefono=data.get('telefono', ''),
                total_usd=round(total_usd, 2),
                total_ves=round(total_ves, 2),
                productos_json=json.dumps(productos),
                nota=data.get('nota', '')
            )
            return JsonResponse({
                'success': True,
                'codigo': pedido.codigo_seguimiento
            })
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)


def detalle_importacion(request, pk):
    pedido = get_object_or_404(PedidoImportacion, pk=pk)
    return render(request, 'detalle_importacion.html', {'p': pedido})


# ==============================================================================
# DASHBOARD Y ANALÍTICAS
# ==============================================================================

def dashboard(request):
    total_productos = Producto.objects.count()
    total_ordenes = OrdenServicio.objects.count()
    ordenes_activas = OrdenServicio.objects.exclude(estado__in=['ENTREGADO', 'CANCELADO']).count()
    stock_bajo = Producto.objects.filter(stock__lte=5, disponible=True).count()
    ordenes_por_estado = OrdenServicio.objects.values('estado').annotate(total=Count('id')).order_by('estado')
    categorias_count = Categoria.objects.annotate(total=Count('producto')).order_by('-total')
    return render(request, 'dashboard.html', {
        'total_productos': total_productos,
        'total_ordenes': total_ordenes,
        'ordenes_activas': ordenes_activas,
        'stock_bajo': stock_bajo,
        'ordenes_por_estado': ordenes_por_estado,
        'categorias_count': categorias_count,
    })


# ==============================================================================
# API REST BÁSICA
# ==============================================================================

def api_productos(request):
    productos = Producto.objects.filter(disponible=True).select_related('categoria').values(
        'id', 'nombre', 'descripcion', 'precio', 'stock', 'categoria__nombre'
    )
    return JsonResponse(list(productos), safe=False)


def api_ordenes(request, codigo=None):
    if codigo:
        try:
            orden = OrdenServicio.objects.prefetch_related(
                Prefetch('lineas_presupuesto'),
                Prefetch('avances')
            ).get(codigo_rastreo=codigo)
            data = {
                'codigo': orden.codigo_rastreo,
                'cliente': orden.cliente_nombre,
                'equipo': orden.equipo,
                'estado': orden.get_estado_display(),
                'presupuesto_estado': orden.get_presupuesto_estado_display(),
                'fecha_ingreso': orden.fecha_ingreso.isoformat(),
                'lineas_presupuesto': list(orden.lineas_presupuesto.values('concepto', 'monto')),
                'avances': list(orden.avances.values('fecha', 'descripcion')),
            }
            return JsonResponse(data)
        except OrdenServicio.DoesNotExist:
            return JsonResponse({'error': 'Orden no encontrada'}, status=404)
    return JsonResponse({'error': 'Código de orden requerido'}, status=400)