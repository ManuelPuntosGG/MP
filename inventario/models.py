from django.db import models
from django.utils import timezone

class Categoria(models.Model):
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.nombre

class Producto(models.Model):
    categoria = models.ForeignKey(Categoria, on_delete=models.CASCADE)
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
        ('RECIBIDO', 'Equipo Recibido'),
        ('DIAGNOSTICO', 'En Diagnóstico'),
        ('REPUESTOS', 'Esperando Repuestos'),
        ('REPARADO', 'Reparado / Listo para entrega'),
        ('ENTREGADO', 'Entregado al cliente'),
        ('CANCELADO', 'No reparable / Cancelado'),
    ]

    cliente_nombre = models.CharField(max_length=150)
    cliente_telefono = models.CharField(max_length=20)
    equipo = models.CharField(max_length=200, help_text="Ej. iPhone 13 Pro, Canon G4110, PC Armada")
    falla_reportada = models.TextField()
    diagnostico_tecnico = models.TextField(blank=True, null=True)
    
    estado = models.CharField(max_length=20, choices=ESTADOS, default='RECIBIDO')
    costo_estimado = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    
    fecha_ingreso = models.DateTimeField(default=timezone.now)
    fecha_entrega = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Ticket #{self.id} - {self.cliente_nombre} ({self.equipo})"
    
class AvanceOrden(models.Model):
    # Esto conecta cada avance con su respectiva Orden de Servicio
    orden = models.ForeignKey(OrdenServicio, related_name='avances', on_delete=models.CASCADE)
    fecha = models.DateTimeField(auto_now_add=True)
    descripcion = models.TextField(help_text="Ej: Se finalizó el diagnóstico de la placa y se procedió a reemplazar los capacitores.")
    # Campo opcional para adjuntar fotos del proceso
    imagen = models.ImageField(upload_to='avances/', null=True, blank=True)

    class Meta:
        ordering = ['-fecha'] # Ordena del más reciente al más antiguo
        verbose_name = "Avance de Orden"
        verbose_name_plural = "Avances de Órdenes"

    def __str__(self):
        return f"Avance del {self.fecha.strftime('%d/%m/%Y')} - Ticket {self.orden.id}"