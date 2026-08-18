import io
import json
from PIL import Image
from django.test import TestCase, Client
from unittest.mock import patch
from django.urls import reverse
from django.core.files.base import ContentFile
from django.contrib.auth.models import User

from .models import Categoria, Producto, OrdenServicio, AvanceOrden, LineaPresupuesto, PedidoImportacion, PedidoCatalogo, UserProfile
from .forms import SolicitudReparacionForm, EmailUserCreationForm, PerfilForm


def create_test_image():
    img = Image.new('RGB', (100, 100), color='red')
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    return ContentFile(buffer.getvalue(), name='test.jpg')


class CategoriaModelTest(TestCase):
    def test_create_categoria(self):
        cat = Categoria.objects.create(nombre="Procesadores", descripcion="CPUs")
        self.assertEqual(str(cat), "Procesadores")
        self.assertEqual(cat.nombre, "Procesadores")

    def test_verbose_name_plural(self):
        self.assertEqual(str(Categoria._meta.verbose_name_plural), "Categorías")


class ProductoModelTest(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(nombre="Gráficas")

    def test_create_producto(self):
        prod = Producto.objects.create(
            categoria=self.categoria,
            nombre="RTX 3060",
            descripcion="Tarjeta gráfica",
            precio=299.99,
            stock=5
        )
        self.assertEqual(str(prod), "RTX 3060 - Stock: 5")
        self.assertTrue(prod.disponible)

    def test_producto_no_disponible(self):
        prod = Producto.objects.create(
            categoria=self.categoria,
            nombre="GT 710",
            descripcion="Gráfica básica",
            precio=49.99,
            disponible=False
        )
        self.assertFalse(prod.disponible)

    def test_producto_con_imagen(self):
        prod = Producto.objects.create(
            categoria=self.categoria,
            nombre="RX 6600",
            descripcion="AMD GPU",
            precio=249.99,
            imagen=create_test_image()
        )
        self.assertTrue(prod.imagen)
        self.assertIn('.jpg', prod.imagen.name)


class OrdenServicioModelTest(TestCase):
    def test_create_orden(self):
        orden = OrdenServicio.objects.create(
            cliente_nombre="Juan Pérez",
            cliente_telefono="04241234567",
            equipo="RTX 3060 EVGA",
            falla_reportada="No da video"
        )
        self.assertEqual(str(orden), f"Orden {orden.codigo_rastreo} - Juan Pérez (RTX 3060 EVGA)")
        self.assertEqual(orden.estado, "ESPERANDO")
        self.assertEqual(orden.presupuesto_estado, "SIN_PRESUPUESTO")
        self.assertIsNotNone(orden.qr_code)
        self.assertEqual(len(orden.codigo_rastreo), 8)

    def test_orden_codigo_unico(self):
        o1 = OrdenServicio.objects.create(cliente_nombre="A", cliente_telefono="04120000001", equipo="PC1", falla_reportada="F1")
        o2 = OrdenServicio.objects.create(cliente_nombre="B", cliente_telefono="04120000002", equipo="PC2", falla_reportada="F2")
        self.assertNotEqual(o1.codigo_rastreo, o2.codigo_rastreo)

    def test_orden_entregado_set_fecha(self):
        orden = OrdenServicio.objects.create(cliente_nombre="Test", cliente_telefono="04120000000", equipo="Laptop", falla_reportada="No enciende")
        self.assertIsNone(orden.fecha_entrega)
        orden.estado = "ENTREGADO"
        orden.save()
        self.assertIsNotNone(orden.fecha_entrega)

    def test_whatsapp_enlace_telefono_venezolano(self):
        orden = OrdenServicio.objects.create(cliente_nombre="María", cliente_telefono="04141234567", equipo="Monitor", falla_reportada="Pantalla rota")
        enlace = orden.enlace_whatsapp
        self.assertIn("wa.me/584141234567", enlace)
        self.assertIn("Mar%C3%ADa", enlace)
        self.assertIn(orden.codigo_rastreo, enlace)

    def test_whatsapp_enlace_telefono_58(self):
        orden = OrdenServicio.objects.create(cliente_nombre="Luis", cliente_telefono="584141234567", equipo="Teclado", falla_reportada="Teclas no responden")
        enlace = orden.enlace_whatsapp
        self.assertIn("wa.me/584141234567", enlace)


class AvanceOrdenModelTest(TestCase):
    def setUp(self):
        self.orden = OrdenServicio.objects.create(
            cliente_nombre="Test", cliente_telefono="04120000000",
            equipo="PC", falla_reportada="Fallo"
        )

    def test_create_avance(self):
        avance = AvanceOrden.objects.create(
            orden=self.orden,
            descripcion="Diagnóstico completado"
        )
        self.assertEqual(str(avance), f"Avance del {avance.fecha.strftime('%d/%m/%Y')} - Ticket {self.orden.codigo_rastreo}")
        self.assertIsNotNone(avance.fecha)

    def test_avance_ordering(self):
        a1 = AvanceOrden.objects.create(orden=self.orden, descripcion="Primero")
        a2 = AvanceOrden.objects.create(orden=self.orden, descripcion="Segundo")
        avances = self.orden.avances.all()
        self.assertEqual(avances[0], a2)
        self.assertEqual(avances[1], a1)


class LineaPresupuestoModelTest(TestCase):
    def setUp(self):
        self.orden = OrdenServicio.objects.create(
            cliente_nombre="Test", cliente_telefono="04120000000",
            equipo="Laptop", falla_reportada="No carga"
        )

    def test_create_linea(self):
        linea = LineaPresupuesto.objects.create(
            orden=self.orden,
            concepto="Fuente de poder",
            monto=45.00
        )
        self.assertIn("Fuente de poder", str(linea))
        self.assertIn("45", str(linea))
        self.assertEqual(linea.monto, 45.00)


class SolicitudReparacionFormTest(TestCase):
    def test_valid_form(self):
        data = {
            'cliente_nombre': 'juan perez',
            'cliente_telefono': '04241234567',
            'equipo': 'RTX 3060',
            'falla_reportada': 'No da video'
        }
        form = SolicitudReparacionForm(data=data)
        self.assertTrue(form.is_valid())
        self.assertEqual(form.cleaned_data['cliente_nombre'], 'Juan Perez')

    def test_invalid_form_empty(self):
        form = SolicitudReparacionForm(data={})
        self.assertFalse(form.is_valid())
        self.assertIn('cliente_nombre', form.errors)
        self.assertIn('cliente_telefono', form.errors)
        self.assertIn('equipo', form.errors)
        self.assertIn('falla_reportada', form.errors)








class ViewAPITest(TestCase):
    def setUp(self):
        self.client = Client()
        self.categoria = Categoria.objects.create(nombre="RAM")
        Producto.objects.create(categoria=self.categoria, nombre="DDR4", descripcion="RAM", precio=89.99, stock=10)
        self.orden = OrdenServicio.objects.create(
            cliente_nombre="Test", cliente_telefono="04120000000",
            equipo="PC", falla_reportada="Fallo"
        )

    def test_api_productos(self):
        response = self.client.get(reverse('inventario:api_productos'))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['nombre'], 'DDR4')

    def test_api_ordenes_valid(self):
        response = self.client.get(reverse('inventario:api_orden_detalle', args=[self.orden.codigo_rastreo]))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['codigo'], self.orden.codigo_rastreo)

    def test_api_ordenes_invalid(self):
        response = self.client.get(reverse('inventario:api_orden_detalle', args=['INVALIDO']))
        self.assertEqual(response.status_code, 404)

    def test_api_ordenes_no_code(self):
        response = self.client.get(reverse('inventario:api_ordenes'))
        self.assertEqual(response.status_code, 400)




class PedidoImportacionModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('test@test.com', 'test@test.com', 'testpass')

    @patch('inventario.models.obtener_tasa_binance')
    def test_import_order_state_flow_and_rates(self, mock_tasa):
        # 1. Creamos un pedido en estado PENDIENTE
        mock_tasa.return_value = 40.00
        pedido = PedidoImportacion.objects.create(
            usuario=self.user,
            total_usd=100.00,
            productos_json='[{"nombre": "CPU Cooler", "precio": 100, "peso": 1}]',
            cliente_nombre='Test Importacion'
        )
        self.assertEqual(pedido.estado, 'PENDIENTE')
        self.assertEqual(pedido.tasa_confirmacion, 40.00)
        self.assertEqual(pedido.pago_inicial_usd, 50.00)
        self.assertEqual(pedido.pago_inicial_ves, 2000.00)
        self.assertEqual(pedido.saldo_pendiente_usd, 50.00)
        
        # 2. Transición a CONFIRMADA (se debe congelar el 50% abono inicial a tasa de confirmación)
        pedido.estado = 'CONFIRMADA'
        pedido.save()
        
        self.assertEqual(pedido.pago_inicial_usd, 50.00)
        self.assertEqual(pedido.saldo_pendiente_usd, 50.00)
        self.assertEqual(pedido.tasa_confirmacion, 40.00)
        self.assertEqual(pedido.pago_inicial_ves, 2000.00) # 50 * 40
        self.assertIsNone(pedido.tasa_entrega)
        self.assertIsNone(pedido.saldo_pendiente_ves)
        
        # 3. Transición a LISTO_RETIRAR (Disponible para retiro)
        # El saldo pendiente en Bs debe calcularse en base a la tasa actual (por ejemplo, si subió a 42.0)
        mock_tasa.return_value = 42.00
        pedido.estado = 'LISTO_RETIRAR'
        pedido.save()
        
        self.assertEqual(pedido.saldo_pendiente_ves_actual, 2100.00) # 50 * 42 (tasa actual)
        
        # 4. Transición a ENTREGADO
        # Se congela la tasa de entrega (42.0) y el saldo pendiente final (2100.0)
        pedido.estado = 'ENTREGADO'
        pedido.save()
        
        self.assertEqual(pedido.tasa_entrega, 42.00)
        self.assertEqual(pedido.saldo_pendiente_ves, 2100.00)
        
        # El saldo pendiente ves actual ahora retorna el congelado
        mock_tasa.return_value = 45.00
        self.assertEqual(pedido.saldo_pendiente_ves_actual, 2100.00) # No varía aunque cambie la tasa



class PedidoCatalogoModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('test@test.com', 'test@test.com', 'testpass')
        self.categoria = Categoria.objects.create(nombre="RAM")
        self.producto = Producto.objects.create(categoria=self.categoria, nombre="DDR4", descripcion="RAM", precio=89.99)

    def test_create_pedido(self):
        pedido = PedidoCatalogo.objects.create(
            usuario=self.user,
            productos_json=json.dumps([{'producto_id': self.producto.id, 'nombre': self.producto.nombre, 'precio': self.producto.precio, 'cantidad': 2}]),
            total_usd=self.producto.precio * 2
        )
        self.assertIn(pedido.codigo_seguimiento, str(pedido))
        self.assertEqual(pedido.total_usd, 179.98)





class PedidoCatalogoModelPropertyTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('test@test.com', 'test@test.com', 'testpass')

    def test_productos_parsed_empty(self):
        pedido = PedidoCatalogo.objects.create(usuario=self.user, total_usd=100)
        self.assertEqual(pedido.productos_parsed(), [])

    def test_productos_parsed_valid_json(self):
        productos = [{'nombre': 'RAM', 'precio': 50, 'cantidad': 2}]
        pedido = PedidoCatalogo.objects.create(usuario=self.user, total_usd=100, productos_json=json.dumps(productos))
        self.assertEqual(pedido.productos_parsed(), productos)

    def test_productos_parsed_invalid_json(self):
        pedido = PedidoCatalogo.objects.create(usuario=self.user, total_usd=100, productos_json='not json')
        self.assertEqual(pedido.productos_parsed(), [])


import time
from django.core import mail
from .models import Pago


class EmailNotificationsTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user('comprador@gmail.com', 'comprador@gmail.com', 'password123')
        UserProfile.objects.create(usuario=self.user, nombre_completo="Carlos Méndez", telefono="04245022292")
        self.categoria = Categoria.objects.create(nombre="Graficas")
        self.producto = Producto.objects.create(
            categoria=self.categoria,
            nombre="RTX 4060",
            descripcion="GPU Nvidia",
            precio=350.00,
            stock=10
        )

    def _esperar_emails(self, cantidad_esperada=1, timeout=2.0):
        """Espera a que los hilos de envío asíncrono completen los correos en mail.outbox."""
        start = time.time()
        while len(mail.outbox) < cantidad_esperada and (time.time() - start) < timeout:
            time.sleep(0.05)

    def test_notificacion_nuevo_pedido_catalogo_usuario_logueado(self):
        """Un usuario logueado compra en catálogo: se envía confirmación al cliente y alerta al admin."""
        self.client.force_login(self.user)
        mail.outbox.clear()

        response = self.client.post(
            reverse('inventario:api_finalizar_catalogo'),
            data=json.dumps({
                'nombre': 'Carlos Méndez',
                'telefono': '04245022292',
                'productos': [{
                    'producto_id': self.producto.id,
                    'nombre': self.producto.nombre,
                    'precio': '350.00',
                    'cantidad': 1
                }]
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self._esperar_emails(cantidad_esperada=2)

        # Se deben haber enviado 2 correos: 1 al cliente registrado y 1 al admin
        self.assertEqual(len(mail.outbox), 2)
        destinatarios = [m.to[0] for m in mail.outbox]
        self.assertIn('comprador@gmail.com', destinatarios)
        self.assertIn('grupomptech@gmail.com', destinatarios)

    def test_notificacion_nuevo_pedido_catalogo_anonimo(self):
        """Un usuario invitado compra en catálogo: NO se envía al cliente, SÍ se envía al admin."""
        mail.outbox.clear()

        response = self.client.post(
            reverse('inventario:api_finalizar_catalogo'),
            data=json.dumps({
                'nombre': 'Invitado Anónimo',
                'telefono': '04141112233',
                'productos': [{
                    'producto_id': self.producto.id,
                    'nombre': self.producto.nombre,
                    'precio': '350.00',
                    'cantidad': 1
                }]
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self._esperar_emails(cantidad_esperada=1)

        # Solo debe haber 1 correo: para el admin
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to[0], 'grupomptech@gmail.com')

    def test_cambio_estado_pedido_catalogo(self):
        """Al cambiar el estado de un pedido con usuario, se le notifica por correo."""
        pedido = PedidoCatalogo.objects.create(
            usuario=self.user,
            cliente_nombre="Carlos Méndez",
            total_usd=350.00,
            productos_json=json.dumps([{'nombre': 'RTX 4060', 'precio': 350, 'cantidad': 1}])
        )
        mail.outbox.clear()

        pedido.estado = 'ENTREGADO'
        pedido.save()
        self._esperar_emails(cantidad_esperada=1)

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to[0], 'comprador@gmail.com')
        self.assertIn("Actualización de Pedido", mail.outbox[0].subject)

    def test_notificacion_nueva_importacion_y_cambio_estado(self):
        """Creación y actualización de importación para usuario logueado."""
        self.client.force_login(self.user)
        mail.outbox.clear()

        response = self.client.post(
            reverse('inventario:api_guardar_importacion'),
            data=json.dumps({
                'nombre': 'Carlos Méndez',
                'telefono': '04245022292',
                'total_usd': 200.00,
                'total_ves': 152000.00,
                'productos': [{'tienda': 'Amazon', 'url': 'https://amazon.com/item', 'precio': 150, 'peso': 2}],
                'nota': 'Urgente'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self._esperar_emails(cantidad_esperada=2)

        # 2 correos: 1 al cliente, 1 al admin
        self.assertEqual(len(mail.outbox), 2)
        destinatarios = [m.to[0] for m in mail.outbox]
        self.assertIn('comprador@gmail.com', destinatarios)
        self.assertIn('grupomptech@gmail.com', destinatarios)

        # Cambio de estado de importación
        mail.outbox.clear()
        pedido_import = PedidoImportacion.objects.get(usuario=self.user)
        pedido_import.estado = 'EN_TRANSITO_VENEZUELA'
        pedido_import.carrier_nombre = 'DHL'
        pedido_import.carrier_tracking = 'DHL-987654'
        pedido_import.save()
        self._esperar_emails(cantidad_esperada=1)

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to[0], 'comprador@gmail.com')
        self.assertIn("Estado de Importación", mail.outbox[0].subject)

    def test_notificacion_reparacion_avances_y_presupuesto(self):
        """Flujo técnico de reparación: creación, cambio de estado, bitácora y presupuesto."""
        self.client.force_login(self.user)
        mail.outbox.clear()

        # 1. Crear solicitud de reparación
        response = self.client.post(
            reverse('inventario:api_solicitar_reparacion'),
            data=json.dumps({
                'cliente_nombre': 'Carlos Méndez',
                'cliente_telefono': '04245022292',
                'equipo': 'Laptop ASUS ROG',
                'falla_reportada': 'No enciende, posible corto en línea de 19V'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self._esperar_emails(cantidad_esperada=2)

        # 2 correos: 1 al cliente, 1 al admin
        self.assertEqual(len(mail.outbox), 2)
        destinatarios = [m.to[0] for m in mail.outbox]
        self.assertIn('comprador@gmail.com', destinatarios)
        self.assertIn('grupomptech@gmail.com', destinatarios)

        orden = OrdenServicio.objects.get(usuario=self.user)

        # 2. Técnico añade avance a la bitácora
        mail.outbox.clear()
        AvanceOrden.objects.create(
            orden=orden,
            descripcion="Se identificó MOSFET en corto en la etapa de potencia principal."
        )
        self._esperar_emails(cantidad_esperada=1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to[0], 'comprador@gmail.com')
        self.assertIn("Nuevo Avance Técnico", mail.outbox[0].subject)

        # 3. Se carga presupuesto detallado (pasa a PENDIENTE)
        mail.outbox.clear()
        LineaPresupuesto.objects.create(orden=orden, concepto="Reemplazo MOSFETs y reballing", monto=85.00)
        self._esperar_emails(cantidad_esperada=1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to[0], 'comprador@gmail.com')
        self.assertIn("Presupuesto Disponible", mail.outbox[0].subject)

        # 4. Cambio de estado de la orden a REPARADO
        mail.outbox.clear()
        orden.estado = 'REPARADO'
        orden.save()
        self._esperar_emails(cantidad_esperada=1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to[0], 'comprador@gmail.com')
        self.assertIn("Estado de Reparación", mail.outbox[0].subject)

    def test_notificacion_pago_reportado_y_verificado(self):
        """Registro de pago (alerta al admin) y verificación (alerta al cliente)."""
        orden = OrdenServicio.objects.create(
            usuario=self.user,
            cliente_nombre="Carlos Méndez",
            cliente_telefono="04245022292",
            equipo="GPU RX 6700 XT",
            falla_reportada="Artefactos en pantalla"
        )
        mail.outbox.clear()

        # 1. Cliente reporta pago
        response = self.client.post(
            reverse('inventario:api_registrar_pago'),
            data=json.dumps({
                'tipo_orden': 'servicio',
                'codigo_orden': orden.codigo_rastreo,
                'monto_usd': 85.00,
                'monto_ves': 64600.00,
                'metodo': 'PAGO_MOVIL',
                'fecha': '2026-08-18',
                'referencia': 'PM-998877',
                'concepto': 'Reparación GPU'
            }),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self._esperar_emails(cantidad_esperada=1)

        # Debe llegarle correo al admin para verificar
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to[0], 'grupomptech@gmail.com')
        self.assertIn("Nuevo Pago Reportado", mail.outbox[0].subject)

        # 2. Admin verifica el pago
        mail.outbox.clear()
        pago = Pago.objects.get(referencia='PM-998877')
        pago.estado = 'VERIFICADO'
        pago.save()
        self._esperar_emails(cantidad_esperada=1)

        # Debe llegarle confirmación al cliente logueado
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to[0], 'comprador@gmail.com')
        self.assertIn("Pago Verificado", mail.outbox[0].subject)







