import decimal
import requests
from django.core.cache import cache
from django.shortcuts import render, redirect
from django.core.paginator import Paginator
from django.db.models import Q

from .forms import SolicitudReparacionForm
from .models import Categoria, Producto, OrdenServicio


def obtener_tasa_binance():
    """
    Consulta el precio actual del USDT en Bolívares (VES) en el P2P de Binance.
    Usa headers avanzados para evitar el bloqueo anti-bots.
    """
    tasa = cache.get('tasa_usdt_ves')
    if tasa:
        return tasa

    url = "https://p2p.binance.com/bapi/c2c/v2/public/c2c/p2p/main/tradeList"
    payload = {
        "asset": "USDT",
        "fiat": "VES",
        "merchantCheck": False,
        "page": 1,
        "payTypes": [],
        "publisherType": None,
        "rows": 3,
        "tradeType": "BUY"
    }
    
    # HEADERS MEJORADOS: Simulamos ser Google Chrome navegando desde la página de P2P
    headers = {
        "Accept": "*/*",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Content-Type": "application/json",
        "Origin": "https://p2p.binance.com",
        "Referer": "https://p2p.binance.com/es/trade/Buy/USDT?fiat=VES&payment=all-payments",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }

    try:
        # Aumentamos el timeout a 8 segundos por si la conexión local está inestable
        response = requests.post(url, json=payload, headers=headers, timeout=8)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('data'):
                precio_filtrado = float(data['data'][0]['adv']['price'])
                cache.set('tasa_usdt_ves', precio_filtrado, 900)
                return precio_filtrado
        else:
            # CHIVATO: Si Binance rechaza la conexión, lo verás en la consola donde corre tu servidor
            print(f"⚠️ Binance bloqueó la petición: Status {response.status_code}")
            
    except requests.exceptions.Timeout:
        print("⚠️ El servidor tardó mucho en responder (Timeout).")
    except Exception as e:
        print(f"⚠️ Error general consultando Binance: {e}")
    
    # Retorna la última tasa guardada, o 720.00 si el caché está vacío
    return cache.get('tasa_usdt_ves', 720.00)


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