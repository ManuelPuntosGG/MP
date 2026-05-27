import secrets
from django.db import models
from django.utils import timezone
import qrcode
from io import BytesIO
from django.core.files.base import ContentFile
from django.conf import settings

def generar_codigo_unico():
    # Genera un código de 8 caracteres alfanuméricos
    return secrets.token_hex(4).upper()

class Categoria(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.nombre

class Producto(models.Model):
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT)
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField()
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=0)
    imagen = models.ImageField(upload_to='productos/', blank=True, null=True)
    disponible = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.nombre} - Stock: {self.stock}"

class OrdenServicio(models.Model):
    ESTADOS = [
        ('ESPERANDO', 'Esperando Ingreso'),
        ('RECIBIDO', 'Recibido'),
        ('DIAGNOSTICO', 'En Diagnóstico'),
        ('REPUESTOS', 'Esperando Repuestos'),
        ('REPARADO', 'Reparado / Listo para entrega'),
        ('ENTREGADO', 'Entregado al cliente'),
        ('CANCELADO', 'No reparable / Cancelado'),
    ]

    cliente_nombre = models.CharField(max_length=150)
    cliente_telefono = models.CharField(max_length=20)
    equipo = models.CharField(max_length=200, help_text="Ej. RTX 3060 EVGA XC GAMING, Laptop HP Pavilion 15, etc.")
    falla_reportada = models.TextField()
    diagnostico_tecnico = models.TextField(blank=True, null=True)
    
    codigo_rastreo = models.CharField(
        max_length=12, 
        unique=True, 
        default=generar_codigo_unico, 
        editable=False
    )

    # NUEVO: Campo para guardar la imagen del QR
    qr_code = models.ImageField(upload_to='qrs/', blank=True, null=True)
    
    estado = models.CharField(max_length=20, choices=ESTADOS, default='ESPERANDO')
    costo_estimado = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    
    fecha_ingreso = models.DateTimeField(default=timezone.now)
    fecha_entrega = models.DateTimeField(blank=True, null=True)

    def generar_qr(self):
        """Genera el QR y lo guarda en el campo qr_code"""
        # CAMBIA 'tusitio.com' por el dominio real de tu web
        url_seguimiento = f"https://mp-tech-dl5s.onrender.com/rastrear/{self.codigo_rastreo}"
        
        qr = qrcode.QRCode(version=1, box_size=5, border=1)
        qr.add_data(url_seguimiento)
        qr.make(fit=True)
        img = qr.make_image(fill='black', back_color='white')
        
        buffer = BytesIO()
        img.save(buffer, 'PNG')
        filename = f'qr_{self.codigo_rastreo}.png'
        self.qr_code.save(filename, ContentFile(buffer.getvalue()), save=False)

    def save(self, *args, **kwargs):
        # 1. Lógica de fechas y estado
        if self.estado == 'ENTREGADO' and not self.fecha_entrega:
            self.fecha_entrega = timezone.now()
        elif self.estado != 'ENTREGADO':
            self.fecha_entrega = None
            
        # 2. Generar QR si no existe
        if not self.qr_code:
            self.generar_qr()
            
        super().save(*args, **kwargs)

    def enlace_whatsapp(self):
        numero_limpio = ''.join(filter(str.isdigit, self.cliente_telefono))
        mensaje = (
            f"¡Hola *{self.cliente_nombre}*! Tu equipo (*{self.equipo}*) "
            f"tiene una actualización registrada. "
            f"Consulta los detalles en: https://mp-tech-dl5s.onrender.com/rastreo/?codigo={self.codigo_rastreo}"
        )
        import urllib.parse
        mensaje_url = urllib.parse.quote(mensaje)
        return f"https://wa.me/+58{numero_limpio}?text={mensaje_url}"

    def __str__(self):
        return f"Orden {self.codigo_rastreo} - {self.cliente_nombre} ({self.equipo})"

class AvanceOrden(models.Model):
    orden = models.ForeignKey(OrdenServicio, related_name='avances', on_delete=models.CASCADE)
    fecha = models.DateTimeField(auto_now_add=True)
    descripcion = models.TextField(help_text="Ej: Se finalizó el diagnóstico...")
    imagen = models.ImageField(upload_to='avances/', null=True, blank=True)

    class Meta:
        ordering = ['-fecha']
        verbose_name = "Avance de Orden"
        verbose_name_plural = "Avances de Órdenes"

    def __str__(self):
        return f"Avance del {self.fecha.strftime('%d/%m/%Y')} - Ticket {self.orden.codigo_rastreo}"