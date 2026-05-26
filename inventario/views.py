import decimal
import requests
from django.core.cache import cache
from django.shortcuts import render, redirect
from django.core.paginator import Paginator
from django.db.models import Q
from .forms import SolicitudReparacionForm
from .models import Categoria, Producto, OrdenServicio
from django.shortcuts import render, get_object_or_404


def imprimir_ticket(request, pk):
    # Buscamos la orden por su ID (o pk)
    orden = get_object_or_404(OrdenServicio, pk=pk)
    
    # Renderizamos la plantilla de 58mm
    return render(request, 'imprimir_ticket.html', {'ticket': orden})

def obtener_tasa_binance():

    # 1. Intentar leer desde la caché de Django (1 hora)
    tasa = cache.get('tasa_usdt_ves')
    if tasa:
        return tasa

    # -------------------------------------------------------------------------
    # INTENTO 1: CoinGecko API con Diagnóstico de JSON
    # -------------------------------------------------------------------------
    try:
        print("🔄 [INTENTO 1] Consultando CoinGecko...")
        url_coingecko = "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ves"
        
        # ⚠️ Asegúrate de colocar tu llave real aquí si usas CoinGecko
        COINGECKO_KEY = "CG-ybVxa4i2NXhfgLtKzHa2YPY8" 
        
        headers = {
            "accept": "application/json",
            "x-cg-demo-api-key": COINGECKO_KEY
        }
        
        response = requests.get(url_coingecko, headers=headers, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            # 👇 ESTE PRINT TE MOSTRARÁ EN RENDER QUÉ ESTÁ LLEGANDO REALMENTE
            print(f"📊 [DIAGNÓSTICO COINGECKO] JSON recibido: {data}")
            
            if 'tether' in data and 'ves' in data['tether']:
                precio = float(data['tether']['ves'])
                print(f"✅ [ÉXITO] Tasa recuperada de CoinGecko: {precio} Bs.")
                cache.set('tasa_usdt_ves', precio, 3600)
                return precio
                
        print(f"⚠️ CoinGecko respondió con estatus {response.status_code} pero no pasó la validación. Intentando ExchangeRate...")
    except Exception as error_api:
        print(f"⚠️ Falló la conexión con CoinGecko: {error_api}. Intentando ExchangeRate...")

    # -------------------------------------------------------------------------
    # INTENTO 2: ExchangeRate-API (Inmune a bloqueos de Render, libre de llaves, estable)
    # -------------------------------------------------------------------------
    try:
        print("🔄 [INTENTO 2] Consultando API de respaldo global (ExchangeRate)...")
        url_exchangerate = "https://open.er-api.com/v6/latest/USD"
        response = requests.get(url_exchangerate, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if 'rates' in data and 'VES' in data['rates']:
                tasa_bcv = float(data['rates']['VES'])
                
                # 🛠️ TU MASTERSTROKE: Ajuste del 35% para saltar de tasa oficial a tasa P2P real
                FACTOR_AJUSTE = 1.35
                precio = round(tasa_bcv * FACTOR_AJUSTE, 2)
                
                print(f"✅ [ÉXITO GLOBAL] Tasa BCV encontrada ({tasa_bcv} Bs) + 35% de ajuste aplicado.")
                print(f"📈 Tasa final calculada para el catálogo: {precio} Bs.")
                
                cache.set('tasa_usdt_ves', precio, 3600)  # Guardar este resultado optimizado por 1 hora
                return precio
    except Exception as error_global:
        print(f"⚠️ Falló la conexión con ExchangeRate-API: {error_global}")

    # -------------------------------------------------------------------------
    # ÚLTIMO RECURSO: Colchón de seguridad estático basado en tu realidad actual
    # -------------------------------------------------------------------------
    fallback = cache.get('tasa_usdt_ves', 720.00)
    print(f"ℹ️ [INFO] Entregando tasa de respaldo final de seguridad: {fallback} Bs.")
    return fallback

def solicitar_reparacion(request):
    if request.method == 'POST':
        form = SolicitudReparacionForm(request.POST)
        if form.is_valid():
            nueva_orden = form.save()
            return render(request, 'exito_solicitud.html', {'orden': nueva_orden})
    else:
        form = SolicitudReparacionForm()

    return render(request, 'solicitar_reparacion.html', {'form': form})


def inicio(request):
    return render(request, 'inicio.html')


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
    
    # --- CÁLCULO DE LA TASA EN BOLÍVARES ---
    tasa_usdt = obtener_tasa_binance()
    tasa_decimal = decimal.Decimal(tasa_usdt)
    
    for producto in page_obj:
        producto.precio_ves = producto.precio * tasa_decimal
    # ---------------------------------------

    categorias = Categoria.objects.all()
    
    contexto = {
        'page_obj': page_obj,
        'categorias': categorias,
        'query_busqueda': query_busqueda,
        'categoria_seleccionada': int(categoria_id) if (categoria_id and categoria_id.isdigit()) else None,
        'tasa_ves': tasa_usdt # Enviamos la tasa al HTML
    }
    
    return render(request, 'catalogo.html', contexto)


def rastrear_ticket(request):
    ticket = None
    error = None
    codigo = request.GET.get('codigo', '').strip().upper()

    if codigo:
        try:
            ticket = OrdenServicio.objects.get(codigo_rastreo=codigo)
        except OrdenServicio.DoesNotExist:
            error = f"No se encontró ninguna orden con el código {codigo}."

    return render(request, 'rastreo.html', {'ticket': ticket, 'error': error, 'codigo': codigo})