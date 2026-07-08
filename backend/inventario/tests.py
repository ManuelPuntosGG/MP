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


class ViewInicioTest(TestCase):
    def setUp(self):
        self.client = Client()

    def test_inicio_status(self):
        response = self.client.get(reverse('inventario:inicio'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'inicio.html')


class ViewCatalogoTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.categoria = Categoria.objects.create(nombre="RAM")
        self.producto = Producto.objects.create(
            categoria=self.categoria,
            nombre="DDR4 16GB",
            descripcion="Memoria RAM",
            precio=89.99,
            stock=10
        )

    def test_catalogo_status(self):
        response = self.client.get(reverse('inventario:catalogo'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'catalogo.html')
        self.assertContains(response, "DDR4 16GB")

    def test_catalogo_search(self):
        response = self.client.get(reverse('inventario:catalogo'), {'q': 'DDR4'})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "DDR4 16GB")

    def test_catalogo_search_no_results(self):
        response = self.client.get(reverse('inventario:catalogo'), {'q': 'NOEXISTE'})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "No se encuentran productos disponibles")

    def test_catalogo_filter_category(self):
        response = self.client.get(reverse('inventario:catalogo'), {'categoria': self.categoria.id})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "DDR4 16GB")

    def test_catalogo_disabled_product_not_shown(self):
        Producto.objects.create(
            categoria=self.categoria,
            nombre="GT 710",
            descripcion="Vieja",
            precio=29.99,
            disponible=False
        )
        response = self.client.get(reverse('inventario:catalogo'))
        self.assertNotContains(response, "GT 710")

    def test_catalogo_pagination(self):
        for i in range(25):
            Producto.objects.create(
                categoria=self.categoria,
                nombre=f"Producto {i}",
                descripcion="Test",
                precio=10.00
            )
        response = self.client.get(reverse('inventario:catalogo'))
        self.assertTrue('page_obj' in response.context)
        self.assertEqual(len(response.context['page_obj']), 20)


class ViewRastreoTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.orden = OrdenServicio.objects.create(
            cliente_nombre="Test", cliente_telefono="04120000000",
            equipo="PC Gamer", falla_reportada="No enciende"
        )

    def test_rastreo_status(self):
        response = self.client.get(reverse('inventario:rastrear_ticket'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'rastreo.html')

    def test_rastreo_valid_code(self):
        response = self.client.get(reverse('inventario:rastrear_ticket'), {'codigo': self.orden.codigo_rastreo})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.orden.codigo_rastreo)
        self.assertIsNotNone(response.context['ticket'])

    def test_rastreo_invalid_code(self):
        response = self.client.get(reverse('inventario:rastrear_ticket'), {'codigo': 'AAAAAAAA'})
        self.assertEqual(response.status_code, 200)
        self.assertIsNotNone(response.context['error'])

    def test_rastreo_with_budget(self):
        LineaPresupuesto.objects.create(orden=self.orden, concepto="Reparación", monto=50.00)
        self.orden.presupuesto_estado = "PENDIENTE"
        self.orden.save()
        response = self.client.get(reverse('inventario:rastrear_ticket'), {'codigo': self.orden.codigo_rastreo})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "$50")


class ViewSolicitarReparacionTest(TestCase):
    def setUp(self):
        self.client = Client()

    def test_solicitar_get(self):
        response = self.client.get(reverse('inventario:solicitar_reparacion'))
        self.assertEqual(response.status_code, 200)

    def test_solicitar_post_valid(self):
        data = {
            'cliente_nombre': 'juan perez',
            'cliente_telefono': '04241234567',
            'equipo': 'Laptop HP',
            'falla_reportada': 'Pantalla azul'
        }
        response = self.client.post(reverse('inventario:solicitar_reparacion'), data)
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'exito_solicitud.html')
        self.assertContains(response, 'Laptop HP')

    def test_solicitar_post_invalid(self):
        response = self.client.post(reverse('inventario:solicitar_reparacion'), {})
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Rastrear Reparación")


class ViewResponderPresupuestoTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.orden = OrdenServicio.objects.create(
            cliente_nombre="Test", cliente_telefono="04120000000",
            equipo="Monitor", falla_reportada="No prende",
            presupuesto_estado="PENDIENTE"
        )

    def test_aprobar_presupuesto(self):
        response = self.client.post(reverse('inventario:responder_presupuesto', args=[self.orden.pk, 'aprobar']))
        self.assertRedirects(response, f"{reverse('inventario:rastrear_ticket')}?codigo={self.orden.codigo_rastreo}")
        self.orden.refresh_from_db()
        self.assertEqual(self.orden.presupuesto_estado, "APROBADO")
        self.assertEqual(self.orden.estado, "REPUESTOS")

    def test_rechazar_presupuesto(self):
        response = self.client.post(reverse('inventario:responder_presupuesto', args=[self.orden.pk, 'rechazar']))
        self.assertRedirects(response, f"{reverse('inventario:rastrear_ticket')}?codigo={self.orden.codigo_rastreo}")
        self.orden.refresh_from_db()
        self.assertEqual(self.orden.presupuesto_estado, "RECHAZADO")
        self.assertEqual(self.orden.estado, "CANCELADO")


class ViewImprimirTicketTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.orden = OrdenServicio.objects.create(
            cliente_nombre="Test", cliente_telefono="04120000000",
            equipo="PC", falla_reportada="Fallo"
        )

    def test_imprimir_ticket(self):
        response = self.client.get(reverse('inventario:imprimir_ticket', args=[self.orden.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'imprimir_ticket.html')
        self.assertContains(response, self.orden.codigo_rastreo)


class ViewCotizadorTest(TestCase):
    def setUp(self):
        self.client = Client()

    def test_cotizador_status(self):
        response = self.client.get(reverse('inventario:cotizador_auto'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'importaciones.html')


class ViewRegistroTest(TestCase):
    def setUp(self):
        self.client = Client()

    def test_registro_get(self):
        response = self.client.get(reverse('inventario:registrar_cliente'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'registro.html')

    def test_registro_post_valid(self):
        response = self.client.post(reverse('inventario:registrar_cliente'), {
            'email': 'test@example.com',
            'password1': 'Testpass123!',
            'password2': 'Testpass123!',
        })
        self.assertRedirects(response, reverse('inventario:perfil_cliente'))


class ViewLoginTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user('testuser', 'test@example.com', 'Testpass123!')
        self.user.email = 'test@example.com'
        self.user.save()

    def test_login_get(self):
        response = self.client.get(reverse('inventario:iniciar_sesion'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'login.html')

    def test_login_post_valid(self):
        response = self.client.post(reverse('inventario:iniciar_sesion'), {
            'email': 'test@example.com',
            'password': 'Testpass123!',
        })
        self.assertRedirects(response, reverse('inventario:perfil_cliente'))

    def test_login_post_invalid(self):
        response = self.client.post(reverse('inventario:iniciar_sesion'), {
            'email': 'test@example.com',
            'password': 'wrong',
        })
        self.assertEqual(response.status_code, 200)


class ViewDashboardTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user('test@test.com', 'test@test.com', 'testpass')
        self.user.email = 'test@test.com'
        self.user.save()

    def test_dashboard_status(self):
        self.client.login(username='test@test.com', password='testpass')
        response = self.client.get(reverse('inventario:dashboard'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'dashboard.html')


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


class URLTest(TestCase):
    def test_urls_resolve(self):
        self.assertEqual(reverse('inventario:inicio'), '/')
        self.assertEqual(reverse('inventario:catalogo'), '/catalogo/')
        self.assertEqual(reverse('inventario:rastrear_ticket'), '/rastreo/')
        self.assertEqual(reverse('inventario:solicitar_reparacion'), '/solicitar/')
        self.assertEqual(reverse('inventario:cotizador_auto'), '/importaciones/')
        self.assertEqual(reverse('inventario:registrar_cliente'), '/registro/')
        self.assertEqual(reverse('inventario:iniciar_sesion'), '/login/')
        self.assertEqual(reverse('inventario:perfil_cliente'), '/perfil/')
        self.assertEqual(reverse('inventario:dashboard'), '/dashboard/')
        self.assertEqual(reverse('inventario:api_productos'), '/api/productos/')
        self.assertEqual(reverse('inventario:password_reset'), '/password-reset/')


class AdminTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin = User.objects.create_superuser('admin', 'admin@test.com', 'admin123')

    def test_admin_login_required(self):
        response = self.client.get('/admin/')
        self.assertRedirects(response, '/admin/login/?next=/admin/')

    def test_admin_login(self):
        self.client.login(username='admin', password='admin123')
        response = self.client.get('/admin/')
        self.assertEqual(response.status_code, 200)


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
        self.assertNil = lambda x: self.assertIsNone(x)
        self.assertIsNone(pedido.tasa_confirmacion)
        self.assertIsNone(pedido.pago_inicial_usd)
        self.assertIsNone(pedido.pago_inicial_ves)
        self.assertIsNone(pedido.saldo_pendiente_usd)
        
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
        pedido.estado = 'LISTO_RETIRAR'
        pedido.save()
        
        mock_tasa.return_value = 42.00
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


class ViewPerfilTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user('test@test.com', 'test@test.com', 'testpass')
        self.user.email = 'test@test.com'
        self.user.save()

    def test_perfil_requires_login(self):
        response = self.client.get(reverse('inventario:perfil_cliente'))
        self.assertRedirects(response, f"/login/?next={reverse('inventario:perfil_cliente')}")

    def test_perfil_logged_in(self):
        self.client.login(username='test@test.com', password='testpass')
        response = self.client.get(reverse('inventario:perfil_cliente'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'perfil.html')

    def test_perfil_shows_linked_orders(self):
        self.client.login(username='test@test.com', password='testpass')
        importacion = PedidoImportacion.objects.create(usuario=self.user, total_usd=100, productos_json='[]', cliente_nombre='Test')
        pedido_catalogo = PedidoCatalogo.objects.create(usuario=self.user, total_usd=50, productos_json='[]', cliente_nombre='Test')
        response = self.client.get(reverse('inventario:perfil_cliente'))
        self.assertIn(importacion, response.context['importaciones'])
        self.assertIn(pedido_catalogo, response.context['pedidos_catalogo'])

    def test_importacion_anonymous(self):
        response = self.client.post(reverse('inventario:guardar_importacion'), json.dumps({
            'total_usd': 200, 'total_ves': 160000,
            'productos': [{'nombre': 'GPU', 'precio': 200}],
            'nombre': 'Juan', 'telefono': '04121234567',
            'nota': 'Test'
        }), content_type='application/json')
        data = response.json()
        self.assertTrue(data['success'])
        pedido = PedidoImportacion.objects.get(codigo_seguimiento=data['codigo'])
        self.assertEqual(pedido.cliente_nombre, 'Juan')
        self.assertEqual(pedido.cliente_telefono, '04121234567')
        self.assertIsNone(pedido.usuario)

    def test_importacion_authenticated(self):
        self.client.login(username='test@test.com', password='testpass')
        response = self.client.post(reverse('inventario:guardar_importacion'), json.dumps({
            'total_usd': 200, 'total_ves': 160000,
            'productos': [{'nombre': 'GPU', 'precio': 200}],
            'nombre': 'Juan', 'telefono': '04121234567'
        }), content_type='application/json')
        data = response.json()
        self.assertTrue(data['success'])
        pedido = PedidoImportacion.objects.get(codigo_seguimiento=data['codigo'])
        self.assertEqual(pedido.usuario, self.user)


class ViewGuardarImportacionTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user('test@test.com', 'test@test.com', 'testpass')
        self.user.email = 'test@test.com'
        self.user.save()

    def test_requires_login(self):
        response = self.client.post(reverse('inventario:guardar_importacion'), json.dumps({'total_usd': 100, 'productos': [{'nombre': 'Test'}], 'nombre': 'Juan'}), content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])

    def test_guardar_pedido(self):
        self.client.login(username='test@test.com', password='testpass')
        response = self.client.post(reverse('inventario:guardar_importacion'), json.dumps({
            'total_usd': 200,
            'total_ves': 160000,
            'productos': [{'nombre': 'GPU', 'precio': 200}],
            'nombre': 'Juan',
            'nota': 'Test'
        }), content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('codigo', data)


class ViewPasswordResetTest(TestCase):
    def setUp(self):
        self.client = Client()

    def test_password_reset_get(self):
        response = self.client.get(reverse('inventario:password_reset'))
        self.assertEqual(response.status_code, 200)

    def test_password_reset_post(self):
        response = self.client.post(reverse('inventario:password_reset'), {'email': 'nonexistent@test.com'})
        self.assertRedirects(response, reverse('inventario:password_reset_done'))


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


class ViewPerfilEditarTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user('test@test.com', 'test@test.com', 'testpass')
        self.user.email = 'test@test.com'
        self.user.save()
        UserProfile.objects.get_or_create(usuario=self.user, defaults={'telefono': '04121234567'})

    def test_perfil_editar_requires_login(self):
        response = self.client.get(reverse('inventario:perfil_editar'))
        self.assertRedirects(response, f"/login/?next={reverse('inventario:perfil_editar')}")

    def test_perfil_editar_get(self):
        self.client.login(username='test@test.com', password='testpass')
        response = self.client.get(reverse('inventario:perfil_editar'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'perfil_editar.html')

    def test_perfil_editar_post(self):
        self.client.login(username='test@test.com', password='testpass')
        response = self.client.post(reverse('inventario:perfil_editar'), {
            'email': 'nuevo@test.com',
            'telefono': '04241234567'
        })
        self.assertRedirects(response, reverse('inventario:perfil_cliente'))
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'nuevo@test.com')


class ViewFinalizarPedidoCatalogoTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.categoria = Categoria.objects.create(nombre="RAM")
        self.producto = Producto.objects.create(
            id=1,
            categoria=self.categoria,
            nombre="RAM",
            precio=50.00,
            stock=10,
            disponible=True
        )

    def test_finalizar_sin_carrito(self):
        response = self.client.post(reverse('inventario:finalizar_catalogo'), json.dumps({}), content_type='application/json')
        data = response.json()
        self.assertFalse(data['success'])
        self.assertIn('vacío', data['error'])

    def test_finalizar_con_carrito(self):
        productos = [{'producto_id': 1, 'nombre': 'RAM', 'precio': 50, 'cantidad': 2, 'stock': 10}]
        response = self.client.post(reverse('inventario:finalizar_catalogo'), json.dumps({'productos': productos, 'nombre': 'Test', 'telefono': '04121234567'}), content_type='application/json')
        data = response.json()
        self.assertTrue(data['success'])
        self.assertIn('codigo', data)
        self.assertEqual(data['total'], 100)


class ViewRastreoPreFillTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user('test@test.com', 'test@test.com', 'testpass')
        self.user.email = 'test@test.com'
        self.user.save()
        UserProfile.objects.get_or_create(usuario=self.user, defaults={'telefono': '04121234567'})

    def test_rastreo_prefill_anonymous(self):
        response = self.client.get(reverse('inventario:rastrear_ticket'))
        self.assertEqual(response.status_code, 200)
        form = response.context['form']
        self.assertEqual(form.initial.get('cliente_nombre', ''), '')
        self.assertEqual(form.initial.get('cliente_telefono', ''), '')

    def test_rastreo_prefill_authenticated(self):
        self.client.login(username='test@test.com', password='testpass')
        response = self.client.get(reverse('inventario:rastrear_ticket'))
        self.assertEqual(response.status_code, 200)
        form = response.context['form']
        self.assertIn('test', form.initial.get('cliente_nombre', ''))
        self.assertEqual(form.initial.get('cliente_telefono', ''), '04121234567')


class EmailNormalizationAndAuthTest(TestCase):
    def setUp(self):
        self.client = Client()
        # Crear usuario con email normalizado
        self.user = User.objects.create_user('normalizado@test.com', 'normalizado@test.com', 'Testpass123!')
        self.user.email = 'normalizado@test.com'
        self.user.save()

    def test_registration_normalizes_email(self):
        response = self.client.post(reverse('inventario:registrar_cliente'), {
            'email': 'NUEVO@TEST.COM',
            'password1': 'Nuevopass123!',
            'password2': 'Nuevopass123!',
        })
        self.assertRedirects(response, reverse('inventario:perfil_cliente'))
        user_exists = User.objects.filter(email='nuevo@test.com').exists()
        self.assertTrue(user_exists)

    def test_login_is_case_insensitive(self):
        response = self.client.post(reverse('inventario:iniciar_sesion'), {
            'email': 'NORMALIZADO@TEST.COM',
            'password': 'Testpass123!',
        })
        self.assertRedirects(response, reverse('inventario:perfil_cliente'))


class StockDecrementAndTransactionsTest(TestCase):
    def setUp(self):
        self.client = Client()
        self.categoria = Categoria.objects.create(nombre="GPUs")
        self.producto = Producto.objects.create(
            categoria=self.categoria,
            nombre="RTX 4060",
            descripcion="12GB VRAM",
            precio=350.00,
            stock=3,
            disponible=True
        )

    def test_checkout_decrements_stock(self):
        productos_json = [{
            'producto_id': self.producto.id,
            'nombre': self.producto.nombre,
            'precio': float(self.producto.precio),
            'cantidad': 2
        }]
        response = self.client.post(reverse('inventario:finalizar_catalogo'), json.dumps({
            'productos': productos_json,
            'nombre': 'Cliente Prueba',
            'telefono': '04121111111'
        }), content_type='application/json')
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])
        
        # Verificar stock actualizado
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock, 1)

    def test_checkout_insufficient_stock(self):
        productos_json = [{
            'producto_id': self.producto.id,
            'nombre': self.producto.nombre,
            'precio': float(self.producto.precio),
            'cantidad': 5 # Más del stock disponible (3)
        }]
        response = self.client.post(reverse('inventario:finalizar_catalogo'), json.dumps({
            'productos': productos_json,
            'nombre': 'Cliente Prueba',
            'telefono': '04121111111'
        }), content_type='application/json')
        
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()['success'])
        self.assertIn('insuficiente', response.json()['error'])
        
        # Verificar stock intacto
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock, 3)

    def test_comprar_ahora_decrements_stock(self):
        response = self.client.post(
            reverse('inventario:comprar_producto', args=[self.producto.id]),
            json.dumps({'nombre': 'Juan', 'telefono': '04122222222'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])
        
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock, 2)

    def test_cancel_order_restores_stock(self):
        # Crear un pedido directamente en PENDIENTE (que restaría stock, supongamos que ya restamos stock)
        # Para simular, inicialmente tenemos el stock en 3.
        # Creamos un pedido de 2 unidades.
        self.producto.stock = 1
        self.producto.save()
        
        pedido = PedidoCatalogo.objects.create(
            cliente_nombre="Test Cancelar",
            total_usd=700.00,
            estado='PENDIENTE',
            productos_json=json.dumps([{
                'producto_id': self.producto.id,
                'nombre': self.producto.nombre,
                'precio': 350.00,
                'cantidad': 2
            }])
        )
        
        # Cambiamos estado a CANCELADO
        pedido.estado = 'CANCELADO'
        pedido.save()
        
        # El stock debe retornar de 1 a 3
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock, 3)

    def test_delete_pending_order_restores_stock(self):
        self.producto.stock = 1
        self.producto.save()
        
        pedido = PedidoCatalogo.objects.create(
            cliente_nombre="Test Borrar",
            total_usd=700.00,
            estado='PENDIENTE',
            productos_json=json.dumps([{
                'producto_id': self.producto.id,
                'nombre': self.producto.nombre,
                'precio': 350.00,
                'cantidad': 2
            }])
        )
        
        # Eliminar el pedido pendiente
        pedido.delete()
        
        # El stock debe retornar de 1 a 3
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock, 3)

    def test_delete_non_pending_order_does_not_restore_stock(self):
        self.producto.stock = 1
        self.producto.save()
        
        pedido = PedidoCatalogo.objects.create(
            cliente_nombre="Test Entregado",
            total_usd=700.00,
            estado='ENTREGADO', # Ya fue entregado
            productos_json=json.dumps([{
                'producto_id': self.producto.id,
                'nombre': self.producto.nombre,
                'precio': 350.00,
                'cantidad': 2
            }])
        )
        
        # Eliminar el pedido entregado (no debe restaurar stock)
        pedido.delete()
        
        # El stock debe seguir en 1
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock, 1)

    def test_bulk_delete_pending_orders_restores_stock(self):
        self.producto.stock = 1
        self.producto.save()
        
        # Crear dos pedidos pendientes
        pedido1 = PedidoCatalogo.objects.create(
            cliente_nombre="Test Borrar Masivo 1",
            total_usd=350.00,
            estado='PENDIENTE',
            productos_json=json.dumps([{
                'producto_id': self.producto.id,
                'nombre': self.producto.nombre,
                'precio': 350.00,
                'cantidad': 1
            }])
        )
        pedido2 = PedidoCatalogo.objects.create(
            cliente_nombre="Test Borrar Masivo 2",
            total_usd=350.00,
            estado='PENDIENTE',
            productos_json=json.dumps([{
                'producto_id': self.producto.id,
                'nombre': self.producto.nombre,
                'precio': 350.00,
                'cantidad': 2
            }])
        )
        
        # Realizar eliminación en lote (bulk delete) via queryset
        PedidoCatalogo.objects.filter(id__in=[pedido1.id, pedido2.id]).delete()
        
        # El stock debe retornar de 1 a 4 (1 + 1 + 2)
        self.producto.refresh_from_db()
        self.assertEqual(self.producto.stock, 4)



