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
    Obtiene la tasa de Binance P2P de forma dinámica usando pyDolarVenezuela.
    Evita errores de llaves (KeyErrors) buscando el monitor de forma flexible.
    """
    tasa = cache.get('tasa_usdt_ves')
    if tasa:
        return tasa

    try:
        print("🔄 [INTENTO] Iniciando pyDolarVenezuela con ExchangeMonitor...")
        
        # Inicializar la base de datos local interna de la librería
        db = LocalDatabase(motor='sqlite', url='pydolar_cache.db')
        monitor = Monitor(ExchangeMonitor, 'USD', db=db)
        
        # 1. Solicitamos TODOS los monitores en lugar de uno solo para inspeccionar sus llaves
        todos_los_monitores = monitor.get_value_monitors()
        
        # 2. Diagnóstico en logs para que veas qué llaves trajo el proveedor
        llaves_disponibles = list(todos_los_monitores.keys()) if isinstance(todos_los_monitores, dict) else []
        print(f"🔍 [DIAGNÓSTICO] Llaves disponibles en el proveedor: {llaves_disponibles}")
        
        # 3. Búsqueda inteligente de la llave de Binance
        llave_binance = None
        for llave in llaves_disponibles:
            if 'binance' in llave.lower():
                llave_binance = llave
                break
                
        # 4. Extraer el precio de la llave encontrada
        if llave_binance:
            binance_data = todos_los_monitores[llave_binance]
            
            # La librería puede devolver un objeto o un diccionario según la subversión
            if hasattr(binance_data, 'price'):
                precio = float(binance_data.price)
            elif isinstance(binance_data, dict) and 'price' in binance_data:
                precio = float(binance_data['price'])
            else:
                precio = None
                
            if precio:
                print(f"✅ [ÉXITO] Tasa encontrada dinámicamente ({llave_binance}): {precio} Bs.")
                cache.set('tasa_usdt_ves', precio, 900)
                return precio
        else:
            print("⚠️ [ALERTA] No se encontró ningún monitor que contenga la palabra 'binance'.")
            
    except Exception as e:
        print(f"💥 [ERROR CRÍTICO] Falló la ejecución de pyDolarVenezuela: {e}")

    # PLAN DE RESPALDO: Si las llaves cambian por completo, salvamos las papas con un valor base real
    fallback = cache.get('tasa_usdt_ves', 45.00)
    print(f"ℹ️ [INFO] Usando tasa de respaldo de seguridad: {fallback}")
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