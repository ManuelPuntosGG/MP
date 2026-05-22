from django.apps import AppConfig
from django.db.models.signals import post_migrate

class InventarioConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'inventario'

    def ready(self):
        # Conectamos la señal para que se ejecute después de las migraciones
        post_migrate.connect(create_superuser, sender=self)

def create_superuser(sender, **kwargs):
    from django.contrib.auth.models import User
    
    # Verifica si el usuario 'admin' ya existe para no intentar crearlo de nuevo
    if not User.objects.filter(username='admin').exists():
        # AQUÍ CAMBIA 'tu_contraseña' por una contraseña segura
        User.objects.create_superuser('admin', 'alphamegc@gmail.com', 'MEGC2525')
        print("¡Usuario administrador creado automáticamente!")