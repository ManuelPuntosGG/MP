from django.shortcuts import render, redirect
from .forms import SolicitudReparacionForm
# Asegúrate de importar tu modelo OrdenServicio si no está importado
from .models import Producto, OrdenServicio

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
    # Usar select_related para evitar consultas N+1 sobre la categoria
    productos_qs = Producto.objects.filter(disponible=True).select_related('categoria')
    # Paginación: 20 productos por página
    paginator = Paginator(productos_qs, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    return render(request, 'catalogo.html', {'page_obj': page_obj})

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
