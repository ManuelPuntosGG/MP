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
    Consulta el precio del USDT en Bolívares.
    Incluye redundancia (Plan B y Plan C) con servidores estables para Render.
    """
    tasa = cache.get('tasa_usdt_ves')
    if tasa:
        return tasa

    # PLAN B: Servidor oficial y autohospedado (Ya no usamos el subdominio viejo de Vercel)
    url_principal = "https://pydolarve.org/api/v1/dollar"
    
    try:
        print("🔄 [INTENTO 1] Consultando pydolarve.org...")
        response = requests.get(url_principal, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            monitores = data.get('monitors', {})
            binance_data = monitores.get('binance', {})
            
            if binance_data and 'price' in binance_data:
                precio = float(binance_data['price'])
                print(f"✅ [ÉXITO] Tasa Binance obtenida de pydolarve.org: {precio} Bs.")
                cache.set('tasa_usdt_ves', precio, 900)
                return precio
        
        print(f"⚠️ [ALERTA] API principal respondió con status {response.status_code}. Saltando al Plan C...")
    except Exception as e:
        print(f"⚠️ [ALERTA] Falló conexión con API principal: {e}. Saltando al Plan C...")


    # PLAN C: API de CriptoDólar (Proveedor alternativo altamente estable)
    url_alternativa = "https://api.criptodolar.xyz/v1/dollar/binance"
    
    try:
        print("🔄 [INTENTO 2] Consultando api.criptodolar.xyz...")
        response = requests.get(url_alternativa, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            # Este API devuelve directamente los datos de Binance
            if 'price' in data:
                precio = float(data['price'])
                print(f"✅ [ÉXITO] Tasa Binance obtenida de CriptoDólar: {precio} Bs.")
                cache.set('tasa_usdt_ves', precio, 900)
                return precio
    except Exception as e:
        print(f"💥 [ERROR CRÍTICO] Ambos APIs caídos. Fallo total: {e}")


    # PLAN D: Último recurso si todo internet falla
    fallback = cache.get('tasa_usdt_ves', 45.00)
    print(f"ℹ️ [INFO] Usando tasa de respaldo final: {fallback}")
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