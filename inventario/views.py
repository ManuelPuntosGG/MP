from django.shortcuts import render
from .models import Producto, OrdenServicio

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

    if 'numero_ticket' in request.GET and request.GET['numero_ticket']:
        numero = request.GET['numero_ticket']
        try:
            # Intentamos obtener la orden por su ID (número de ticket)
            ticket = OrdenServicio.objects.get(id=numero)
        except OrdenServicio.DoesNotExist:
            error = f"No se encontró ninguna orden con el número {numero}."
        except ValueError:
            error = "Por favor, ingresa un número de ticket válido."

    return render(request, 'rastreo.html', {'ticket': ticket, 'error': error})