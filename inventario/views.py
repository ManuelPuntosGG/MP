import decimal
import requests
from django.core.cache import cache
from django.shortcuts import render, redirect
from django.core.paginator import Paginator
from django.db.models import Q
from .forms import SolicitudReparacionForm
from .models import Categoria, Producto, OrdenServicio
from pyDolarVenezuela import LocalDatabase, Monitor
from pyDolarVenezuela.pages import ExchangeMonitor  # Cambiamos a ExchangeMonitor (más completo)


def obtener_tasa_binance():
    """
    Obtiene la tasa de Binance de forma híbrida.
    Si pyDolarVenezuela falla por bloqueos de IP o cambios de estructura ('data'),
    resuelve automáticamente con CoinGecko antes de usar el fallback estático.
    """
    # 1. Intentar leer desde la caché de Django para ahorrar peticiones
    tasa = cache.get('tasa_usdt_ves')
    if tasa:
        return tasa

    # -------------------------------------------------------------------------
    # INTENTO 1: pyDolarVenezuela (Tu opción preferida)
    # -------------------------------------------------------------------------
    try:
        print("🔄 [INTENTO 1] Iniciando pyDolarVenezuela...")
        db = LocalDatabase(motor='sqlite', url='pydolar_cache.db')
        monitor = Monitor(ExchangeMonitor, 'USD', db=db)
        
        binance_data = monitor.get_value_monitors('binance')
        
        if binance_data:
            if hasattr(binance_data, 'price'):
                precio = float(binance_data.price)
            elif isinstance(binance_data, dict) and 'price' in binance_data:
                precio = float(binance_data['price'])
            else:
                precio = None

            if precio:
                print(f"✅ [ÉXITO] Tasa obtenida de pyDolarVenezuela: {precio} Bs.")
                cache.set('tasa_usdt_ves', precio, 900)
                return precio
                
    except Exception as e:
        # Aquí atajamos el error 'data' o cualquier cambio de la librería
        print(f"⚠️ [ALERTA] pyDolarVenezuela falló internamente (Error: '{e}'). Pasando al Plan B corporativo...")

    # -------------------------------------------------------------------------
    # PLAN B: CoinGecko API (El escudo balanceador: 100% estable en Render)
    # -------------------------------------------------------------------------
    try:
        print("🔄 [INTENTO 2] Consultando API global de CoinGecko (USDT/VES)...")
        url_coingecko = "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ves"
        response = requests.get(url_coingecko, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if 'tether' in data and 'ves' in data['tether']:
                precio = float(data['tether']['ves'])
                print(f"✅ [ÉXITO] Tasa recuperada exitosamente de CoinGecko: {precio} Bs.")
                cache.set('tasa_usdt_ves', precio, 900)
                return precio
                
        print(f"⚠️ CoinGecko respondió con estatus {response.status_code}. Pasando al último recurso...")
    except Exception as error_api:
        print(f"⚠️ Falló la conexión de respaldo con CoinGecko: {error_api}")

    # -------------------------------------------------------------------------
    # PLAN C: Último recurso (Tasa de emergencia guardada en caché o base)
    # -------------------------------------------------------------------------
    fallback = cache.get('tasa_usdt_ves', 45.00)
    print(f"ℹ️ [INFO] Entregando tasa de respaldo final de seguridad: {fallback}")
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