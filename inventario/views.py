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
    Consulta el precio del USDT en Bolívares usando el API público de Gabriel Baute.
    Estructura optimizada para evitar NameResolutionError en Render.
    """
    tasa = cache.get('tasa_usdt_ves')
    if tasa:
        return tasa

    # PLAN A: API Oficial del repositorio de Gabriel Baute (alojado en Vercel)
    url_gabriel = "https://binance-bcv-dolar.vercel.app/api/binance"
    
    try:
        print("🔄 [INTENTO 1] Consultando API de Gabriel Baute (binance-bcv-dolar)...")
        response = requests.get(url_gabriel, timeout=6)
        
        print(f"🔍 [DIAGNÓSTICO] Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # El JSON de este repo entrega directamente {'rate': 45.20, 'source': 'binance', ...}
            # Usamos un filtrado flexible por si viene como string o float
            if 'rate' in data:
                precio = float(data['rate'])
                print(f"✅ [ÉXITO] Tasa obtenida de Gabriel Baute: {precio} Bs.")
                cache.set('tasa_usdt_ves', precio, 900) # Guardar por 15 min
                return precio
                
        print(f"⚠️ API de Gabriel respondió con status {response.status_code}. Intentando espejo alternativo...")
    except Exception as e:
        print(f"⚠️ Falló conexión con API de Gabriel debido a: {e}. Intentando espejo...")

    # PLAN B: API de respaldo (DolarApi - Altamente estable para Latinoamérica)
    url_espejo = "https://ve.dolarapi.com/v1/dolares/binance"
    
    try:
        print("🔄 [INTENTO 2] Consultando DolarApi de respaldo...")
        response = requests.get(url_espejo, timeout=6)
        if response.status_code == 200:
            data = response.json()
            # Este API devuelve la llave 'promedio'
            if 'promedio' in data:
                precio = float(data['promedio'])
                print(f"✅ [ÉXITO] Tasa obtenida del API Espejo: {precio} Bs.")
                cache.set('tasa_usdt_ves', precio, 900)
                return precio
    except Exception as e:
        print(f"💥 [ERROR CRÍTICO] Todos los proveedores públicos fallaron: {e}")

    # PLAN C: Último recurso si te quedas sin internet o todos los servicios caen
    fallback = cache.get('tasa_usdt_ves', 720.00)
    print(f"ℹ️ [INFO] Entregando tasa de respaldo de seguridad: {fallback}")
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