from django.shortcuts import render, redirect
from .forms import SolicitudReparacionForm
# Asegúrate de importar tu modelo OrdenServicio si no está importado
from .models import Categoria, Producto, OrdenServicio
from django.db.models import Q

def solicitar_reparacion(request):
    # Si el formulario fue enviado
    if request.method == 'POST':
        form = SolicitudReparacionForm(request.POST)
        if form.is_valid():
            # Guardamos la orden en la base de datos
            nueva_orden = form.save()
            
            # Pasamos el código generado a la plantilla de éxito
            return render(request, 'exito_solicitud.html', {'orden': nueva_orden})
    else:
        # Si es la primera vez que entra, mostramos el formulario vacío
        form = SolicitudReparacionForm()

    return render(request, 'solicitar_reparacion.html', {'form': form})

# 1. Vista de la Landing Page (Portada de MP Tech)
def inicio(request):
    return render(request, 'inicio.html')

# 2. Vista del Catálogo (Muestra solo productos disponibles)
from django.core.paginator import Paginator

def catalogo(request):
    # 1. Base del query: solo productos disponibles con su categoría precargada
    productos_qs = Producto.objects.filter(disponible=True).select_related('categoria')
    
    # 2. Capturar los parámetros GET que viajan desde el formulario HTML
    query_busqueda = request.GET.get('q', '').strip()
    categoria_id = request.GET.get('categoria', '')

    # 3. Aplicar Filtro de texto (Buscador) si existe
    if query_busqueda:
        productos_qs = productos_qs.filter(
            Q(nombre__icontains=query_busqueda) | 
            Q(descripcion__icontains=query_busqueda)
        )
    
    # 4. Aplicar Filtro por Categoría si seleccionaron alguna específica
    if categoria_id and categoria_id.isdigit():
        productos_qs = productos_qs.filter(categoria_id=int(categoria_id))
    
    # 5. Paginación (Mantenemos tus 20 productos por página)
    paginator = Paginator(productos_qs, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # 6. Necesitamos enviar todas las categorías disponibles para pintar los botones/select
    categorias = Categoria.objects.all()
    
    contexto = {
        'page_obj': page_obj,
        'categorias': categorias,
        'query_busqueda': query_busqueda,
        'categoria_seleccionada': int(categoria_id) if (categoria_id and categoria_id.isdigit()) else None
    }
    
    return render(request, 'catalogo.html', contexto)

# 3. Vista del Rastreador de Tickets para los clientes
def rastrear_ticket(request):
    ticket = None
    error = None
    # Cambiamos 'numero_ticket' por 'codigo' para que sea más intuitivo
    codigo = request.GET.get('codigo', '').strip().upper()

    if codigo:
        try:
            # Buscamos por el código único generado
            ticket = OrdenServicio.objects.get(codigo_rastreo=codigo)
        except OrdenServicio.DoesNotExist:
            error = f"No se encontró ninguna orden con el código {codigo}."

    return render(request, 'rastreo.html', {'ticket': ticket, 'error': error, 'codigo': codigo})
