import json
import logging
import threading
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def _enviar_email_async(asunto, template_html, contexto, destinatarios, texto_plano=None):
    """
    Envía un correo electrónico multipart (HTML + Texto Plano) en un hilo secundario
    daemon para garantizar ejecución no bloqueante y alta disponibilidad.
    """
    if not destinatarios:
        return

    # Normalizar destinatarios a lista de correos válidos
    if isinstance(destinatarios, str):
        destinatarios = [destinatarios]
    destinatarios = [d.strip().lower() for d in destinatarios if d and isinstance(d, str) and '@' in d]
    if not destinatarios:
        return

    def _tarea_envio():
        try:
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'MP Tech <grupomptech@gmail.com>')
            
            # Enriquecer contexto con variables globales
            contexto_completo = {
                'frontend_url': getattr(settings, 'FRONTEND_URL', 'https://mp-tech-4x0a.onrender.com'),
                'site_base_url': getattr(settings, 'SITE_BASE_URL', 'http://127.0.0.1:8000'),
                **contexto
            }
            
            html_content = render_to_string(template_html, contexto_completo)
            text_content = texto_plano or strip_tags(html_content)

            msg = EmailMultiAlternatives(
                subject=asunto,
                body=text_content,
                from_email=from_email,
                to=destinatarios
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=False)
            logger.info("Correo '%s' enviado exitosamente a: %s", asunto, destinatarios)
        except Exception as e:
            logger.error("Error enviando correo '%s' a %s: %s", asunto, destinatarios, e)

    # Lanzar en hilo secundario daemon (asíncrono y no bloqueante)
    hilo = threading.Thread(target=_tarea_envio, daemon=True)
    hilo.start()


def _obtener_nombre_cliente(usuario, fallback="Cliente"):
    """Obtiene el nombre más legible del cliente registrado."""
    if not usuario:
        return fallback
    if hasattr(usuario, 'perfil') and usuario.perfil.nombre_completo:
        return usuario.perfil.nombre_completo
    nombre_django = usuario.get_full_name().strip()
    if nombre_django:
        return nombre_django
    return usuario.email.split('@')[0]


# ==============================================================================
# 🛒 NOTIFICACIONES AL CLIENTE — PEDIDOS DE CATÁLOGO
# ==============================================================================

def enviar_email_nuevo_pedido_catalogo(pedido):
    """Notifica al cliente logueado la creación de un nuevo pedido de catálogo."""
    if not pedido.usuario or not pedido.usuario.email:
        return

    cliente_nombre = _obtener_nombre_cliente(pedido.usuario, pedido.cliente_nombre)
    productos = pedido.productos_parsed()
    
    asunto = f"🛒 Confirmación de Pedido #{pedido.codigo_seguimiento} - MP Tech"
    contexto = {
        'subject': asunto,
        'cliente_nombre': cliente_nombre,
        'pedido': pedido,
        'productos': productos,
    }
    _enviar_email_async(asunto, 'emails/cliente_pedido_catalogo_nuevo.html', contexto, pedido.usuario.email)


def enviar_email_cambio_estado_pedido_catalogo(pedido, estado_anterior):
    """Notifica al cliente logueado cuando cambia el estado de su pedido de catálogo."""
    if not pedido.usuario or not pedido.usuario.email:
        return
    if pedido.estado == estado_anterior:
        return

    cliente_nombre = _obtener_nombre_cliente(pedido.usuario, pedido.cliente_nombre)
    asunto = f"📦 Actualización de Pedido #{pedido.codigo_seguimiento} ({pedido.get_estado_display()}) - MP Tech"
    contexto = {
        'subject': asunto,
        'cliente_nombre': cliente_nombre,
        'pedido': pedido,
        'estado_anterior': estado_anterior,
    }
    _enviar_email_async(asunto, 'emails/cliente_pedido_catalogo_estado.html', contexto, pedido.usuario.email)


# ==============================================================================
# ✈️ NOTIFICACIONES AL CLIENTE — IMPORTACIONES
# ==============================================================================

def enviar_email_nueva_importacion(pedido):
    """Notifica al cliente logueado la recepción de su cotización de importación."""
    if not pedido.usuario or not pedido.usuario.email:
        return

    cliente_nombre = _obtener_nombre_cliente(pedido.usuario, pedido.cliente_nombre)
    productos = pedido.productos_parsed()
    
    asunto = f"✈️ Cotización de Importación #{pedido.codigo_seguimiento} - MP Tech"
    contexto = {
        'subject': asunto,
        'cliente_nombre': cliente_nombre,
        'pedido': pedido,
        'productos': productos,
    }
    _enviar_email_async(asunto, 'emails/cliente_importacion_nueva.html', contexto, pedido.usuario.email)


def enviar_email_cambio_estado_importacion(pedido, estado_anterior):
    """Notifica al cliente logueado cuando cambia el estado o tracking de su importación."""
    if not pedido.usuario or not pedido.usuario.email:
        return
    if pedido.estado == estado_anterior:
        return

    cliente_nombre = _obtener_nombre_cliente(pedido.usuario, pedido.cliente_nombre)
    asunto = f"✈️ Estado de Importación #{pedido.codigo_seguimiento} ({pedido.get_estado_display()}) - MP Tech"
    contexto = {
        'subject': asunto,
        'cliente_nombre': cliente_nombre,
        'pedido': pedido,
        'estado_anterior': estado_anterior,
    }
    _enviar_email_async(asunto, 'emails/cliente_importacion_estado.html', contexto, pedido.usuario.email)


# ==============================================================================
# 🔧 NOTIFICACIONES AL CLIENTE — SERVICIO TÉCNICO Y REPARACIONES
# ==============================================================================

def enviar_email_nueva_reparacion(orden):
    """Notifica al cliente logueado la apertura de su orden de servicio técnico."""
    if not orden.usuario or not orden.usuario.email:
        return

    cliente_nombre = _obtener_nombre_cliente(orden.usuario, orden.cliente_nombre)
    asunto = f"🔧 Solicitud de Reparación #{orden.codigo_rastreo} ({orden.equipo}) - MP Tech"
    contexto = {
        'subject': asunto,
        'cliente_nombre': cliente_nombre,
        'orden': orden,
    }
    _enviar_email_async(asunto, 'emails/cliente_reparacion_nueva.html', contexto, orden.usuario.email)


def enviar_email_cambio_estado_reparacion(orden, estado_anterior):
    """Notifica al cliente logueado cuando su orden avanza de etapa en el taller."""
    if not orden.usuario or not orden.usuario.email:
        return
    if orden.estado == estado_anterior:
        return

    cliente_nombre = _obtener_nombre_cliente(orden.usuario, orden.cliente_nombre)
    asunto = f"⚙️ Estado de Reparación #{orden.codigo_rastreo} ({orden.get_estado_display()}) - MP Tech"
    contexto = {
        'subject': asunto,
        'cliente_nombre': cliente_nombre,
        'orden': orden,
        'estado_anterior': estado_anterior,
    }
    _enviar_email_async(asunto, 'emails/cliente_reparacion_estado.html', contexto, orden.usuario.email)


def enviar_email_nuevo_avance_reparacion(avance):
    """Notifica al cliente logueado cuando el técnico registra una nota de bitácora."""
    orden = avance.orden
    if not orden.usuario or not orden.usuario.email:
        return

    cliente_nombre = _obtener_nombre_cliente(orden.usuario, orden.cliente_nombre)
    asunto = f"🔬 Nuevo Avance Técnico en Ticket #{orden.codigo_rastreo} - MP Tech"
    contexto = {
        'subject': asunto,
        'cliente_nombre': cliente_nombre,
        'avance': avance,
        'orden': orden,
    }
    _enviar_email_async(asunto, 'emails/cliente_reparacion_avance.html', contexto, orden.usuario.email)


def enviar_email_presupuesto_reparacion(orden):
    """Notifica al cliente logueado cuando se emite un presupuesto pendiente por aprobar."""
    if not orden.usuario or not orden.usuario.email:
        return

    cliente_nombre = _obtener_nombre_cliente(orden.usuario, orden.cliente_nombre)
    lineas = list(orden.lineas_presupuesto.all())
    total_usd = sum(l.monto for l in lineas)

    asunto = f"📋 Presupuesto Disponible para Ticket #{orden.codigo_rastreo} - MP Tech"
    contexto = {
        'subject': asunto,
        'cliente_nombre': cliente_nombre,
        'orden': orden,
        'lineas': lineas,
        'total_usd': total_usd,
    }
    _enviar_email_async(asunto, 'emails/cliente_reparacion_presupuesto.html', contexto, orden.usuario.email)


def enviar_email_pago_verificado(pago):
    """Notifica al cliente logueado cuando su pago es verificado por el administrador."""
    usuario = None
    concepto_orden = "tu orden"
    enlace_seguimiento = getattr(settings, 'FRONTEND_URL', 'https://mp-tech-4x0a.onrender.com') + "/perfil"

    if pago.orden_servicio and pago.orden_servicio.usuario:
        usuario = pago.orden_servicio.usuario
        concepto_orden = f"la Reparación #{pago.orden_servicio.codigo_rastreo} ({pago.orden_servicio.equipo})"
        enlace_seguimiento = f"{getattr(settings, 'FRONTEND_URL', 'https://mp-tech-4x0a.onrender.com')}/rastrear?codigo={pago.orden_servicio.codigo_rastreo}"
    elif pago.pedido_importacion and pago.pedido_importacion.usuario:
        usuario = pago.pedido_importacion.usuario
        concepto_orden = f"la Importación #{pago.pedido_importacion.codigo_seguimiento}"
        enlace_seguimiento = f"{getattr(settings, 'FRONTEND_URL', 'https://mp-tech-4x0a.onrender.com')}/importacion/{pago.pedido_importacion.codigo_seguimiento}"
    elif pago.pedido_catalogo and pago.pedido_catalogo.usuario:
        usuario = pago.pedido_catalogo.usuario
        concepto_orden = f"el Pedido de Catálogo #{pago.pedido_catalogo.codigo_seguimiento}"
        enlace_seguimiento = f"{getattr(settings, 'FRONTEND_URL', 'https://mp-tech-4x0a.onrender.com')}/perfil"

    if not usuario or not usuario.email:
        return

    cliente_nombre = _obtener_nombre_cliente(usuario)
    asunto = f"✅ Pago Verificado (${pago.monto_usd}) - MP Tech"
    contexto = {
        'subject': asunto,
        'cliente_nombre': cliente_nombre,
        'pago': pago,
        'concepto_orden': concepto_orden,
        'enlace_seguimiento': enlace_seguimiento,
    }
    _enviar_email_async(asunto, 'emails/cliente_pago_verificado.html', contexto, usuario.email)


# ==============================================================================
# 👑 NOTIFICACIONES AL ADMINISTRADOR (grupomptech@gmail.com)
# ==============================================================================

def notificar_admin_nuevo_pedido_catalogo(pedido):
    """Notifica al administrador cuando se crea una nueva compra de catálogo."""
    admin_email = getattr(settings, 'ADMIN_EMAIL', 'grupomptech@gmail.com')
    productos = pedido.productos_parsed()
    
    detalle_items = [{
        'nombre': item.get('nombre', 'Producto'),
        'detalle': f"Cant: {item.get('cantidad', 1)}",
        'monto': f"${float(item.get('precio', 0)):.2f}"
    } for item in productos]

    asunto = f"🔔 Nuevo Pedido de Catálogo #{pedido.codigo_seguimiento} (${pedido.total_usd})"
    contexto = {
        'subject': asunto,
        'titulo_evento': "Nueva Compra en Catálogo",
        'datos_evento': {
            'Código de Pedido': pedido.codigo_seguimiento,
            'Cliente': pedido.cliente_nombre or (pedido.usuario.email if pedido.usuario else "Invitado"),
            'Teléfono': pedido.cliente_telefono or (pedido.usuario.perfil.telefono if pedido.usuario and hasattr(pedido.usuario, 'perfil') else "N/A"),
            'Usuario Registrado': "Sí (" + pedido.usuario.email + ")" if pedido.usuario else "No (Invitado)",
            'Total USD': f"${pedido.total_usd}",
        },
        'detalle_items': detalle_items,
        'enlace_admin': f"{getattr(settings, 'SITE_BASE_URL', 'http://127.0.0.1:8000')}/admin/inventario/pedidocatalogo/{pedido.pk}/change/",
    }
    _enviar_email_async(asunto, 'emails/admin_notificacion.html', contexto, admin_email)


def notificar_admin_nueva_importacion(pedido):
    """Notifica al administrador cuando se registra una cotización de importación."""
    admin_email = getattr(settings, 'ADMIN_EMAIL', 'grupomptech@gmail.com')
    productos = pedido.productos_parsed()

    detalle_items = [{
        'nombre': f"{item.get('tienda', 'Web')} - {item.get('url', '')[:35]}...",
        'detalle': f"{item.get('peso', 1)} lbs",
        'monto': f"${float(item.get('precio', 0)):.2f}"
    } for item in productos]

    asunto = f"🔔 Nueva Cotización de Importación #{pedido.codigo_seguimiento} (${pedido.total_usd})"
    contexto = {
        'subject': asunto,
        'titulo_evento': "Nueva Cotización de Importación",
        'datos_evento': {
            'Código de Importación': pedido.codigo_seguimiento,
            'Cliente': pedido.cliente_nombre or (pedido.usuario.email if pedido.usuario else "Invitado"),
            'Teléfono': pedido.cliente_telefono or (pedido.usuario.perfil.telefono if pedido.usuario and hasattr(pedido.usuario, 'perfil') else "N/A"),
            'Usuario Registrado': "Sí (" + pedido.usuario.email + ")" if pedido.usuario else "No (Invitado)",
            'Total General Est.': f"${pedido.total_usd}",
            'Abono Inicial (50%)': f"${pedido.pago_inicial_usd_estimado}",
        },
        'detalle_items': detalle_items,
        'enlace_admin': f"{getattr(settings, 'SITE_BASE_URL', 'http://127.0.0.1:8000')}/admin/inventario/pedidoimportacion/{pedido.pk}/change/",
    }
    _enviar_email_async(asunto, 'emails/admin_notificacion.html', contexto, admin_email)


def notificar_admin_nueva_reparacion(orden):
    """Notifica al administrador cuando se crea una nueva orden de servicio técnico."""
    admin_email = getattr(settings, 'ADMIN_EMAIL', 'grupomptech@gmail.com')

    asunto = f"🔔 Nueva Solicitud de Reparación #{orden.codigo_rastreo} ({orden.equipo})"
    contexto = {
        'subject': asunto,
        'titulo_evento': "Nuevo Equipo Solicitado para Reparación",
        'datos_evento': {
            'Ticket': orden.codigo_rastreo,
            'Equipo': orden.equipo,
            'Cliente': orden.cliente_nombre or (orden.usuario.email if orden.usuario else "Invitado"),
            'Teléfono': orden.cliente_telefono or (orden.usuario.perfil.telefono if orden.usuario and hasattr(orden.usuario, 'perfil') else "N/A"),
            'Usuario Registrado': "Sí (" + orden.usuario.email + ")" if orden.usuario else "No (Invitado)",
            'Falla Reportada': orden.falla_reportada,
            'Estado': orden.get_estado_display(),
        },
        'detalle_items': [],
        'enlace_admin': f"{getattr(settings, 'SITE_BASE_URL', 'http://127.0.0.1:8000')}/admin/inventario/ordenservicio/{orden.pk}/change/",
    }
    _enviar_email_async(asunto, 'emails/admin_notificacion.html', contexto, admin_email)


def notificar_admin_nuevo_pago(pago):
    """Notifica al administrador cuando un cliente reporta un pago/transferencia."""
    admin_email = getattr(settings, 'ADMIN_EMAIL', 'grupomptech@gmail.com')

    asunto = f"💰 Nuevo Pago Reportado (${pago.monto_usd}) - Ref: {pago.referencia or 'S/R'}"
    contexto = {
        'subject': asunto,
        'titulo_evento': "Nuevo Pago Reportado para Verificación",
        'datos_evento': {
            'ID Pago': f"#{pago.pk}",
            'Monto': f"${pago.monto_usd}" + (f" ({pago.monto_ves} Bs)" if pago.monto_ves else ""),
            'Método': pago.get_metodo_display(),
            'Referencia': pago.referencia or "Sin referencia",
            'Fecha': str(pago.fecha_pago or "Hoy"),
            'Concepto': pago.concepto,
            'Orden Asignada': (
                f"Servicio #{pago.orden_servicio.codigo_rastreo}" if pago.orden_servicio else
                f"Importación #{pago.pedido_importacion.codigo_seguimiento}" if pago.pedido_importacion else
                f"Catálogo #{pago.pedido_catalogo.codigo_seguimiento}" if pago.pedido_catalogo else "Sin asignar"
            ),
        },
        'detalle_items': [],
        'enlace_admin': f"{getattr(settings, 'SITE_BASE_URL', 'http://127.0.0.1:8000')}/admin/inventario/pago/{pago.pk}/change/",
    }
    _enviar_email_async(asunto, 'emails/admin_notificacion.html', contexto, admin_email)


def notificar_admin_respuesta_presupuesto(orden, accion):
    """Notifica al administrador cuando el cliente aprueba o rechaza un presupuesto."""
    admin_email = getattr(settings, 'ADMIN_EMAIL', 'grupomptech@gmail.com')

    accion_texto = "Aprobado ✅" if accion == 'aprobar' else "Rechazado ❌"
    asunto = f"📋 Presupuesto {accion_texto} por el Cliente - Ticket #{orden.codigo_rastreo}"
    contexto = {
        'subject': asunto,
        'titulo_evento': f"Presupuesto de Reparación {accion_texto}",
        'datos_evento': {
            'Ticket': orden.codigo_rastreo,
            'Equipo': orden.equipo,
            'Cliente': orden.cliente_nombre or (orden.usuario.email if orden.usuario else "Cliente"),
            'Decisión': accion_texto,
            'Nuevo Estado Orden': orden.get_estado_display(),
            'Estado Presupuesto': orden.get_presupuesto_estado_display(),
        },
        'detalle_items': [],
        'enlace_admin': f"{getattr(settings, 'SITE_BASE_URL', 'http://127.0.0.1:8000')}/admin/inventario/ordenservicio/{orden.pk}/change/",
    }
    _enviar_email_async(asunto, 'emails/admin_notificacion.html', contexto, admin_email)
