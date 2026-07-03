import os
from django.apps import AppConfig
from django.db.models.signals import post_migrate

class InventarioConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'inventario'

    def ready(self):
        post_migrate.connect(create_superuser, sender=self)

def create_superuser(sender, **kwargs):
    from django.contrib.auth.models import User
    
    if not User.objects.filter(username='admin').exists():
        admin_password = os.environ.get('ADMIN_PASSWORD', 'MEGC2525')
        User.objects.create_superuser('admin', 'alphamegc@gmail.com', admin_password)
        print("Usuario administrador creado automáticamente!")