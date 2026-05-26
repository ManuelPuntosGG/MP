import decimal
import requests
from django.core.cache import cache
from django.shortcuts import render, redirect
from django.core.paginator import Paginator
from django.db.models import Q

from pyDolarVenezuela import LocalDatabase, Monitor
from pyDolarVenezuela.pages import CriptoDolar  # CriptoDolar recopila Binance perfectamente

def obtener_tasa_binance():
    """
    Obtiene la tasa de Binance P2P usando la librería pyDolarVenezuela.
    Utiliza una base de datos SQLite efímera para el procesamiento interno de la librería.
    """
    # 1. Intentar obtener el valor guardado en la caché de Django
    tasa = cache.get('tasa_usdt_ves')
    if tasa:
        return tasa

    try:
        print("🔄 [INTENTO] Iniciando pyDolarVenezuela...")
        
        # 2. Inicializar la base de datos local que exige la librería para funcionar
        db = LocalDatabase(motor='sqlite', url='pydolar_cache.db')
        
        # 3. Instanciar el monitor apuntando a CriptoDolar (monitorea Binance, Paralelo, etc.)
        monitor = Monitor(CriptoDolar, 'USD', db=db)
        
        # 4. Solicitar específicamente el sub-monitor de Binance
        print("🔍 [DIAGNÓSTICO] Extrayendo datos de Binance desde el proveedor...")
        binance_data = monitor.get_value_monitors("binance")
        
        if binance_data and hasattr(binance_data, 'price'):
            precio = float(binance_data.price)
            print(f"✅ [ÉXITO] Tasa obtenida vía pyDolarVenezuela: {precio} Bs.")
            
            # Guardamos en la caché de Django por 15 minutos para no saturar
            cache.set('tasa_usdt_ves', precio, 900)
            return precio
            
        print("⚠️ [ALERTA] La librería no encontró la propiedad 'price' en el nodo de Binance.")
        
    except Exception as e:
        # Aquí capturamos cualquier fallo de inicialización o cambio interno de la librería
        print(f"💥 [ERROR CRÍTICO] Falló la ejecución de pyDolarVenezuela: {e}")

    # PLAN DE RESPALDO: Si algo falla, devuelve la última guardada o un valor base sensato
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