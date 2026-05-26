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
    Utiliza un API intermedio para evitar que el firewall de Binance bloquee a Render.
    """
    tasa = cache.get('tasa_usdt_ves')
    if tasa:
        return tasa

    # Usamos el API público de pyDolarVenezuela (Node/Vercel) que funciona perfectamente en la nube
    url = "https://pydolarvenezuela-api.vercel.app/api/v1/dollar"
    
    try:
        # Hacemos una petición GET simple
        response = requests.get(url, timeout=6)
        
        if response.status_code == 200:
            data = response.json()
            
            # Buscamos la información específica de Binance en la respuesta
            # Este API devuelve una estructura con los monitores principales
            monitores = data.get('monitors', {})
            binance_data = monitores.get('binance', {})
            
            if binance_data and 'price' in binance_data:
                precio_filtrado = float(binance_data['price'])
                
                # Guardamos en caché por 15 minutos (900 segundos)
                cache.set('tasa_usdt_ves', precio_filtrado, 900)
                return precio_filtrado
                
    except Exception as e:
        # Si agregaste PYTHONUNBUFFERED=1 en Render, ahora sí verás este error exacto en tu log
        print(f"⚠️ Error consultando API alternativo en Render: {e}")
    
    # Si todo falla, intentamos retornar lo último que haya quedado en caché, o 720.00 como base más realista actual
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