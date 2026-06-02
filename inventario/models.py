import secrets
import os
import urllib.parse
from io import BytesIO
from PIL import Image
import qrcode

from django.db import models
from django.utils import timezone
from django.core.files.base import ContentFile
from django.conf import settings

def generar_codigo_unico():
    return secrets.token_hex(4).upper()

def optimizar_imagen(imagen_campo, tamaño_max=(1024, 1024), calidad=75):
    """Recibe un archivo de imagen, lo redimensiona y lo comprime en JPEG."""
    img = Image.open(imagen_campo)
    
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
        
    img.thumbnail(tamaño_max, Image.Resampling.LANCZOS)
    
    buffer = BytesIO()
    img.save(buffer, format='JPEG', quality=calidad, optimize=True)
    
    nombre_base = os.path.basename(os.path.splitext(imagen_campo.name)[0])
    nuevo_nombre = f"{nombre_base}.jpg"
    
    return ContentFile(buffer.getvalue(), name=nuevo_nombre)


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

    def save(self, *args, **kwargs):
        if self.imagen:
            es_nueva = True
            if self.pk: 
                obj_previo = Producto.objects.get(pk=self.pk)
                if obj_previo.imagen == self.imagen:
                    es_nueva = False
            
            if es_nueva:
                self.imagen = optimizar_imagen(self.imagen)

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.nombre} - Stock: {self.stock}"


class OrdenServicio(models.Model):
    ESTADOS = [
        ('ESPERANDO', 'Esperando Ingreso'),
        ('RECIBIDO', 'Recibido'),
        ('DIAGNOSTICO', 'En Diagnóstico'),
        ('REPUESTOS', 'Reparando / Esperando Repuestos'),
        ('REPARADO', 'Reparado / Listo para entrega'),
        ('ENTREGADO', 'Entregado al cliente'),
        ('CANCELADO', 'No reparable / Cancelado'),
    ]

    ESTADOS_PRESUPUESTO = [
        ('SIN_PRESUPUESTO', 'Sin Presupuesto'),
        ('PENDIENTE', 'Pendiente por Aprobar'),
        ('APROBADO', 'Aprobado por el Cliente'),
        ('RECHAZADO', 'Rechazado por el Cliente'),
    ]
    
    presupuesto_estado = models.CharField(
        max_length=20, 
        choices=ESTADOS_PRESUPUESTO, 
        default='SIN_PRESUPUESTO',
        verbose_name="Estado del Presupuesto"
    )

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

    qr_code = models.ImageField(upload_to='qrs/', blank=True, null=True)
    
    estado = models.CharField(max_length=20, choices=ESTADOS, default='ESPERANDO')
    costo_estimado = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    
    fecha_ingreso = models.DateTimeField(default=timezone.now)
    fecha_entrega = models.DateTimeField(blank=True, null=True)

    def generar_qr(self):
        """Genera el QR y lo guarda en el campo qr_code"""
        # 🚀 CORRECCIÓN: Alineado con tu views.py (/rastreo/?codigo=)
        url_seguimiento = f"https://mp-tech-dl5s.onrender.com/rastreo/?codigo={self.codigo_rastreo}"
        
        qr = qrcode.QRCode(version=1, box_size=5, border=1)
        qr.add_data(url_seguimiento)
        qr.make(fit=True)
        img = qr.make_image(fill='black', back_color='white')
        
        buffer = BytesIO()
        img.save(buffer, 'PNG')
        filename = f'qr_{self.codigo_rastreo}.png'
        self.qr_code.save(filename, ContentFile(buffer.getvalue()), save=False)

    def save(self, *args, **kwargs):
        if self.estado == 'ENTREGADO' and not self.fecha_entrega:
            self.fecha_entrega = timezone.now()
        elif self.estado != 'ENTREGADO':
            self.fecha_entrega = None
            
        if not self.qr_code:
            self.generar_qr()
            
        super().save(*args, **kwargs)

    def enlace_whatsapp(self):
        # 🚀 MEJORA: Formateo inteligente de números locales
        numero_limpio = ''.join(filter(str.isdigit, self.cliente_telefono))
        
        if numero_limpio.startswith('0'):
            numero_limpio = '58' + numero_limpio[1:]
        elif not numero_limpio.startswith('58'):
            numero_limpio = '58' + numero_limpio

        mensaje = (
            f"¡Hola *{self.cliente_nombre}*! Tu equipo (*{self.equipo}*) "
            f"tiene una actualización registrada. "
            f"Consulta los detalles en: https://mp-tech-dl5s.onrender.com/rastreo/?codigo={self.codigo_rastreo}"
        )
        mensaje_url = urllib.parse.quote(mensaje)
        return f"https://wa.me/{numero_limpio}?text={mensaje_url}"

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

    def save(self, *args, **kwargs):
        if self.imagen:
            es_nueva = True
            if self.pk: 
                obj_previo = AvanceOrden.objects.get(pk=self.pk)
                if obj_previo.imagen == self.imagen:
                    es_nueva = False
            
            if es_nueva:
                self.imagen = optimizar_imagen(self.imagen)
                
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Avance del {self.fecha.strftime('%d/%m/%Y')} - Ticket {self.orden.codigo_rastreo}"


class LineaPresupuesto(models.Model):
    orden = models.ForeignKey(OrdenServicio, on_delete=models.CASCADE, related_name='lineas_presupuesto')
    
    # 🚀 MEJORA: Enlace directo al catálogo (opcional, no rompe si lo dejas en blanco)
    producto = models.ForeignKey(Producto, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Repuesto del Inventario")
    
    concepto = models.CharField(max_length=255, verbose_name="Concepto Manual (Si no usas repuesto)")
    monto = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Monto ($)")

    class Meta:
        verbose_name = "Línea de Presupuesto"
        verbose_name_plural = "Líneas de Presupuesto"

    def __str__(self):
        # Muestra el nombre del producto si se seleccionó, si no, muestra el concepto manual
        nombre = self.producto.nombre if self.producto else self.concepto
        return f"{nombre} - {self.monto}"