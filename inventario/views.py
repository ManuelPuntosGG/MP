from django.shortcuts import render
from .models import Producto, OrdenServicio

# 1. Vista de la Landing Page (Portada de MP Tech)
def inicio(request):
    return render(request, 'inicio.html')

# 2. Vista del Catálogo (Muestra solo productos disponibles)
def catalogo(request):
    productos_en_stock = Producto.objects.filter(disponible=True)
    return render(request, 'catalogo.html', {'productos': productos_en_stock})

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