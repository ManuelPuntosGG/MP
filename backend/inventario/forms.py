import logging

from django import forms
from django.contrib.auth import authenticate
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User

from .models import OrdenServicio, UserProfile

logger = logging.getLogger(__name__)


class SolicitudReparacionForm(forms.ModelForm):
    """Formulario para solicitar una reparación de equipo."""

    class Meta:
        model = OrdenServicio
        fields = ['cliente_nombre', 'cliente_telefono', 'equipo', 'falla_reportada']
        widgets = {
            'cliente_nombre': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Ej. Juan Perez',
            }),
            'cliente_telefono': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Ej. 04241234567',
            }),
            'equipo': forms.TextInput(attrs={
                'class': 'form-input',
                'placeholder': 'Ej. Laptop HP Pavilion / RTX 3060 EVGA XC GAMING',
            }),
            'falla_reportada': forms.Textarea(attrs={
                'class': 'form-input',
                'rows': 4,
                'placeholder': 'Describe detalladamente el problema...',
            }),
        }

    def clean_cliente_nombre(self):
        nombre = self.cleaned_data.get('cliente_nombre')
        return nombre.title() if nombre else nombre


class EmailUserCreationForm(UserCreationForm):
    """Formulario de registro de usuarios con email y teléfono opcional."""

    email = forms.EmailField(
        required=True,
        widget=forms.EmailInput(attrs={
            'class': 'form-input',
            'placeholder': 'tu@correo.com',
        }),
    )
    telefono = forms.CharField(
        required=False,
        max_length=20,
        widget=forms.TextInput(attrs={
            'class': 'form-input',
            'placeholder': 'Ej. 04241234567',
        }),
    )

    class Meta:
        model = User
        fields = ('email', 'telefono', 'password1', 'password2')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['password1'].widget.attrs.update({
            'class': 'form-input',
            'placeholder': 'Contraseña',
        })
        self.fields['password2'].widget.attrs.update({
            'class': 'form-input',
            'placeholder': 'Confirmar contraseña',
        })
        self.fields['email'].label = 'Correo electrónico'
        self.fields['telefono'].label = 'Teléfono (opcional)'

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email:
            email = email.strip().lower()
            if User.objects.filter(email=email).exists():
                raise forms.ValidationError("Este correo ya está registrado.")
        return email

    def save(self, commit=True):
        user = super().save(commit=False)
        email_normalized = self.cleaned_data['email'].strip().lower()
        user.username = email_normalized
        user.email = email_normalized
        if commit:
            user.save()
            UserProfile.objects.get_or_create(
                usuario=user,
                defaults={'telefono': self.cleaned_data.get('telefono', '')},
            )
        return user


class EmailAuthenticationForm(forms.Form):
    """Formulario de login que usa email en lugar de username."""

    email = forms.EmailField(
        label='Correo electrónico',
        widget=forms.EmailInput(attrs={
            'class': 'form-input',
            'placeholder': 'tu@correo.com',
            'autofocus': True,
        }),
    )
    password = forms.CharField(
        label='Contraseña',
        strip=False,
        widget=forms.PasswordInput(attrs={
            'class': 'form-input',
            'placeholder': 'Contraseña',
            'autocomplete': 'current-password',
        }),
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
            email = email.strip().lower()
            self.cleaned_data['email'] = email
            self.user_cache = authenticate(
                self.request, username=email, password=password
            )
            if self.user_cache is None:
                raise forms.ValidationError(self.error_messages['invalid_login'])
            self._confirm_login_allowed(self.user_cache)

        return self.cleaned_data

    def _confirm_login_allowed(self, user):
        if not user.is_active:
            raise forms.ValidationError(self.error_messages['inactive'])

    def get_user(self):
        return self.user_cache


class PerfilForm(forms.ModelForm):
    """Formulario para editar el perfil del usuario."""

    telefono = forms.CharField(
        required=False,
        max_length=20,
        widget=forms.TextInput(attrs={
            'class': 'form-input',
            'placeholder': 'Ej. +584241234567',
        }),
    )
    nombre_completo = forms.CharField(
        required=False,
        max_length=150,
        widget=forms.TextInput(attrs={
            'class': 'form-input',
            'placeholder': 'Tu nombre completo',
        }),
    )

    class Meta:
        model = User
        fields = ['email']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['email'].widget.attrs.update({'class': 'form-input'})
        self.fields['email'].label = 'Correo electrónico'

        if self.instance and self.instance.pk:
            try:
                perfil = self.instance.perfil
                self.fields['telefono'].initial = perfil.telefono
                self.fields['nombre_completo'].initial = perfil.nombre_completo
            except UserProfile.DoesNotExist:
                pass

    def save(self, commit=True):
        user = super().save(commit=False)
        if commit:
            user.save()
            perfil, _ = UserProfile.objects.get_or_create(usuario=user)
            perfil.telefono = self.cleaned_data.get('telefono', '')
            perfil.nombre_completo = self.cleaned_data.get('nombre_completo', '')
            perfil.save()
        return user
