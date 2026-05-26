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
    Consulta el precio del USDT en Bolívares con logs de diagnóstico detallados.
    """
    tasa = cache.get('tasa_usdt_ves')
    if tasa:
        return tasa

    # Usamos el endpoint global de monitores (más estable)
    url = "https://pydolarvenezuela-api.vercel.app/api/v1/dollar"
    
    try:
        response = requests.get(url, timeout=6)
        
        # PRIMER DIAGNÓSTICO: Ver qué responde el servidor del API
        print(f"🔍 [DIAGNÓSTICO] Status Code del API externo: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            monitores = data.get('monitors', {})
            binance_data = monitores.get('binance', {})
            
            if binance_data and 'price' in binance_data:
                precio_filtrado = float(binance_data['price'])
                print(f"✅ [ÉXITO] Tasa Binance obtenida: {precio_filtrado} Bs.")
                cache.set('tasa_usdt_ves', precio_filtrado, 900)
                return precio_filtrado
            else:
                # SEGUNDO DIAGNÓSTICO: Si cambió la estructura del JSON
                print(f"⚠️ [ALERTA] Estructura JSON desconocida. Llaves recibidas: {list(data.keys())}")
        else:
            # TERCER DIAGNÓSTICO: Si el API nos da error de servidor o bloqueo
            print(f"⚠️ [ALERTA] El API falló con código {response.status_code}. Respuesta cruda: {response.text[:100]}")
                
    except Exception as e:
        # CUARTO DIAGNÓSTICO: Caída de conexión total
        print(f"💥 [ERROR CRÍTICO] Fallo de red en Render: {e}")
    
    # Si llegó aquí, algo falló. Avisamos cuál tasa de respaldo se usará.
    fallback = cache.get('tasa_usdt_ves', 725.00)
    print(f"ℹ️ [INFO] Usando tasa de respaldo temporal: {fallback}")
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