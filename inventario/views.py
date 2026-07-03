import decimal
import os
import requests
from django.core.cache import cache
from django.shortcuts import render, redirect, get_object_or_404
from django.core.paginator import Paginator
from django.db.models import Q, Sum, Prefetch
from django.views.decorators.http import require_POST

from .forms import SolicitudReparacionForm
from .models import Categoria, Producto, OrdenServicio, AvanceOrden 


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
        COINGECKO_KEY = os.environ.get('COINGECKO_API_KEY', 'CG-ybVxa4i2NXhfgLtKzHa2YPY8')
        
        headers = {
            "accept": "application/json",
            "x-cg-demo-api-key": COINGECKO_KEY
        }
        
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
    form = SolicitudReparacionForm()
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
    if request.method == 'POST':
        form = SolicitudReparacionForm(request.POST)
        if form.is_valid():
            nueva_orden = form.save()
            return render(request, 'exito_solicitud.html', {'orden': nueva_orden})
    else:
        form = SolicitudReparacionForm()

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
    return redirect(f"/rastreo/?codigo={orden.codigo_rastreo}")


def cotizador_auto(request):
    tasa_actual = obtener_tasa_binance()
    return render(request, 'importaciones.html', {'tasa_ves': tasa_actual})