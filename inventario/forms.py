from django import forms
from .models import OrdenServicio

class SolicitudReparacionForm(forms.ModelForm):
    class Meta:
        model = OrdenServicio
        # Solo mostramos los campos que el cliente debe llenar
        fields = ['cliente_nombre', 'cliente_telefono', 'equipo', 'falla_reportada']
        
        # Personalizamos los widgets para que se vean bien en el HTML
        widgets = {
            'cliente_nombre': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Ej. Juan Perez'}),
            'cliente_telefono': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Ej. 04241234567'}),
            'equipo': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Ej. Laptop HP Pavilion / iPhone 12'}),
            'falla_reportada': forms.Textarea(attrs={'class': 'form-input', 'rows': 4, 'placeholder': 'Describe detalladamente el problema...'}),
        }

    # Aquí está la magia para poner la primera letra en mayúscula
    def clean_cliente_nombre(self):
        nombre = self.cleaned_data.get('cliente_nombre')
        if nombre:
            # .title() convierte "juan perez" en "Juan Perez"
            return nombre.title()
        return nombre