import decimal
import re
import requests
from bs4 import BeautifulSoup
from django.core.cache import cache
from django.shortcuts import render, redirect, get_object_or_404
from django.core.paginator import Paginator
from django.db.models import Q, Sum  # <-- Sum optimiza matemáticas de presupuestos
from django.views.decorators.http import require_POST
from django.http import JsonResponse

# Centralizamos todas las importaciones locales aquí arriba
from .forms import SolicitudReparacionForm
from .models import Categoria, Producto, OrdenServicio, AvanceOrden 


def inicio(request):
    return render(request, 'inicio.html')


def imprimir_ticket(request, pk):
    orden = get_object_or_404(OrdenServicio, pk=pk)
    return render(request, 'imprimir_ticket.html', {'ticket': orden})


def obtener_tasa_binance():
    # 1. Intentar leer desde la caché de Django (1 hora)
    tasa = cache.get('tasa_usdt_ves')
    if tasa:
        return tasa

    # -------------------------------------------------------------------------
    # INTENTO 1: CoinGecko API
    # -------------------------------------------------------------------------
    try:
        url_coingecko = "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ves"
        COINGECKO_KEY = "CG-ybVxa4i2NXhfgLtKzHa2YPY8" 
        
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
        print(f"⚠️ Falló CoinGecko: {error_api}")

    # -------------------------------------------------------------------------
    # INTENTO 2: ExchangeRate-API (Respaldo)
    # -------------------------------------------------------------------------
    try:
        url_exchangerate = "https://open.er-api.com/v6/latest/USD"
        response = requests.get(url_exchangerate, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            if 'rates' in data and 'VES' in data['rates']:
                tasa_bcv = float(data['rates']['VES'])
                
                # Ajuste del 32.5% para saltar de tasa oficial a tasa P2P
                FACTOR_AJUSTE = 1.325
                precio = round(tasa_bcv * FACTOR_AJUSTE, 2)
                
                cache.set('tasa_usdt_ves', precio, 3600)
                return precio
    except Exception as error_global:
        print(f"⚠️ Falló ExchangeRate-API: {error_global}")

    # -------------------------------------------------------------------------
    # ÚLTIMO RECURSO: Colchón de seguridad
    # -------------------------------------------------------------------------
    fallback = cache.get('tasa_usdt_ves', 760.00)
    return fallback


def portal_cliente(request):
    """Vista unificada que maneja tanto el rastreo como la creación de nuevas órdenes"""
    
    # 1. Lógica para procesar una NUEVA solicitud (POST)
    if request.method == 'POST':
        form = SolicitudReparacionForm(request.POST)
        if form.is_valid():
            nueva_orden = form.save()
            return render(request, 'exito_solicitud.html', {'orden': nueva_orden})
    else:
        form = SolicitudReparacionForm()

    # 2. Lógica para RASTREAR una orden existente (GET)
    ticket = None
    error = None
    total_usd = decimal.Decimal('0.00')
    total_ves = decimal.Decimal('0.00')
    codigo = request.GET.get('codigo', '').strip().upper()

    if codigo:
        try:
            ticket = OrdenServicio.objects.get(codigo_rastreo=codigo)
            
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
    if request.headers.get('x-requested-with') == 'XMLHttpRequest' and request.method == 'POST':
        url = request.POST.get('url', '').strip()
        if not url:
            return JsonResponse({'status': 'error', 'message': 'Enlace vacío'}, status=400)
        
        # Simulamos ser un navegador real con más detalle
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1"
        }
        
        try:
            tienda = "Otro"
            if "amazon" in url.lower():
                tienda = "Amazon"
            elif "aliexpress" in url.lower():
                tienda = "AliExpress"
            elif "ebay" in url.lower():
                tienda = "eBay"

            response = requests.get(url, headers=headers, timeout=15)
            precio = 0.0
            peso_detectado = 1.0 # Peso por defecto en libras si no se encuentra
            
            if response.status_code == 200:
                html_content = response.text
                soup = BeautifulSoup(html_content, 'html.parser')
                
                if tienda == "Amazon":
                    # Extraer Precio
                    elemento_precio = soup.select_one('span.a-price-whole')
                    if elemento_precio:
                        precio_texto = elemento_precio.get_text(strip=True).replace(',', '.')
                        precio = float(re.sub(r'[^\d.]', '', precio_texto))
                    else:
                        # Fallback Amazon: buscar en metadata
                        match = re.search(r'"price":\s*"(\d+\.\d+)"', html_content)
                        if match: precio = float(match.group(1))

                    # Intentar extraer peso (es muy inestable, pero lo intenta)
                    match_peso = re.search(r'(\d+[\.]?\d*)\s*(pounds|lbs|ounces|oz)', html_content, re.IGNORECASE)
                    if match_peso:
                        valor = float(match_peso.group(1))
                        unidad = match_peso.group(2).lower()
                        if 'oz' in unidad or 'ounce' in unidad:
                            peso_detectado = round(valor / 16, 2) # Convertir onzas a libras
                        else:
                            peso_detectado = valor

                elif tienda == "eBay":
                    # Extraer Precio
                    elemento_precio = soup.select_one('.x-price-primary, [itemprop="price"], .prc-display')
                    if elemento_precio:
                        precio_texto = elemento_precio.get_text(strip=True).replace(',', '.')
                        precio = float(re.sub(r'[^\d.]', '', precio_texto))
                
                elif tienda == "AliExpress":
                    # Extraer Precio buscando en el JSON oculto dentro de las etiquetas <script>
                    # Buscamos patrones comunes que usa AliExpress para declarar el precio en USD
                    patrones = [
                        r'"actMinPrice":"([\d.]+)"',
                        r'"minActivityAmount":\{"currency":"USD","value":([\d.]+)\}',
                        r'"formatedActivityPrice":"US\s*\$([\d.]+)"',
                        r'"price":"([\d.]+)"'
                    ]
                    
                    for patron in patrones:
                        match = re.search(patron, html_content)
                        if match:
                            precio = float(match.group(1))
                            break # Si encuentra el precio, deja de buscar

            return JsonResponse({
                'status': 'success',
                'tienda': tienda,
                'precio': precio,
                'peso_estimado': peso_detectado, # Enviamos el peso al frontend
                'url': url
            })
            
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

    tasa_actual = obtener_tasa_binance()
    return render(request, 'importaciones.html', {'tasa_ves': tasa_actual})