from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import OrdenServicio, UserProfile


class SolicitudReparacionForm(forms.ModelForm):
    class Meta:
        model = OrdenServicio
        fields = ['cliente_nombre', 'cliente_telefono', 'equipo', 'falla_reportada']
        widgets = {
            'cliente_nombre': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Ej. Juan Perez'}),
            'cliente_telefono': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Ej. 04241234567'}),
            'equipo': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Ej. Laptop HP Pavilion / RTX 3060 EVGA XC GAMING'}),
            'falla_reportada': forms.Textarea(attrs={'class': 'form-input', 'rows': 4, 'placeholder': 'Describe detalladamente el problema...'}),
        }

    def clean_cliente_nombre(self):
        nombre = self.cleaned_data.get('cliente_nombre')
        if nombre:
            return nombre.title()
        return nombre


class EmailUserCreationForm(UserCreationForm):
    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(attrs={'class': 'form-input', 'placeholder': 'tu@correo.com'})
    )
    telefono = forms.CharField(
        required=False,
        max_length=20,
        widget=forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Ej. 04241234567'})
    )

    class Meta:
        model = User
        fields = ('email', 'telefono', 'password1', 'password2')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['password1'].widget.attrs.update({'class': 'form-input', 'placeholder': 'Contraseña'})
        self.fields['password2'].widget.attrs.update({'class': 'form-input', 'placeholder': 'Confirmar contraseña'})
        self.fields['email'].label = 'Correo electrónico'
        self.fields['telefono'].label = 'Teléfono (opcional)'

    def save(self, commit=True):
        user = super().save(commit=False)
        user.username = self.cleaned_data['email']
        user.email = self.cleaned_data['email']
        if commit:
            user.save()
            UserProfile.objects.get_or_create(usuario=user, defaults={'telefono': self.cleaned_data.get('telefono', '')})
        return user


class EmailAuthenticationForm(forms.Form):
    email = forms.EmailField(
        label='Correo electrónico',
        widget=forms.EmailInput(attrs={'class': 'form-input', 'placeholder': 'tu@correo.com', 'autofocus': True})
    )
    password = forms.CharField(
        label='Contraseña',
        strip=False,
        widget=forms.PasswordInput(attrs={'class': 'form-input', 'placeholder': 'Contraseña', 'autocomplete': 'current-password'})
    )

    error_messages = {
        'invalid_login': "Correo o contraseña incorrectos.",
        'inactive': "Esta cuenta está inactiva.",
    }

    def __init__(self, request=None, *args, **kwargs):
        self.request = request
        self.user_cache = None
        super().__init__(*args, **kwargs)

    def clean(self):
        email = self.cleaned_data.get('email')
        password = self.cleaned_data.get('password')

        if email is not None and password:
            self.user_cache = authenticate(self.request, username=email, password=password)
            if self.user_cache is None:
                raise forms.ValidationError(self.error_messages['invalid_login'])
            else:
                self.confirm_login_allowed(self.user_cache)

        return self.cleaned_data

    def confirm_login_allowed(self, user):
        if not user.is_active:
            raise forms.ValidationError(self.error_messages['inactive'])

    def get_user(self):
        return self.user_cache


class PerfilForm(forms.ModelForm):
    telefono = forms.CharField(
        required=False,
        max_length=20,
        widget=forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Ej. +584241234567'})
    )
    nombre_completo = forms.CharField(
        required=False,
        max_length=150,
        widget=forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Tu nombre completo'})
    )

    class Meta:
        model = User
        fields = ['email']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['email'].widget.attrs.update({'class': 'form-input'})
        self.fields['email'].label = 'Correo electrónico'
        if self.instance:
            try:
                perfil = self.instance.perfil
                self.fields['telefono'].initial = perfil.telefono
                self.fields['nombre_completo'].initial = perfil.nombre_completo
            except Exception:
                pass

    def save(self, commit=True):
        user = super().save(commit=False)
        if commit:
            user.save()
            perfil, created = UserProfile.objects.get_or_create(usuario=user)
            perfil.telefono = self.cleaned_data.get('telefono', '')
            perfil.nombre_completo = self.cleaned_data.get('nombre_completo', '')
            perfil.save()
        return user
