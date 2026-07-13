from django.urls import path, reverse_lazy
from django.contrib.auth import views as auth_views
from inventario import views

app_name = 'inventario'

urlpatterns = [

    # ==========================================================================
    # PANEL INTERNO (Solo uso del personal de MP Tech)
    # ==========================================================================
    path('dashboard/', views.dashboard, name='dashboard'),
    path('imprimir-ticket/<int:pk>/', views.imprimir_ticket, name='imprimir_ticket'),

    # ==========================================================================
    # RESET DE CONTRASEÑA (Flujo de email de Django — se conserva el server-side)
    # Los links de email llevan al usuario a estas URLs en el navegador.
    # ==========================================================================
    path('password-reset/', auth_views.PasswordResetView.as_view(
        template_name='password_reset.html',
        email_template_name='password_reset_email.html',
        success_url=reverse_lazy('inventario:password_reset_done')
    ), name='password_reset'),
    path('password-reset/done/', auth_views.PasswordResetDoneView.as_view(
        template_name='password_reset_done.html'
    ), name='password_reset_done'),
    path('password-reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(
        template_name='password_reset_confirm.html',
        success_url=reverse_lazy('inventario:password_reset_complete')
    ), name='password_reset_confirm'),
    path('password-reset/complete/', auth_views.PasswordResetCompleteView.as_view(
        template_name='password_reset_complete.html'
    ), name='password_reset_complete'),

    # ==========================================================================
    # API REST — Autenticación y Perfil
    # ==========================================================================
    path('api/login/', views.api_login, name='api_login'),
    path('api/register/', views.api_register, name='api_register'),
    path('api/logout/', views.api_logout, name='api_logout'),
    path('api/user/', views.api_user, name='api_user'),
    path('api/editar-perfil/', views.api_editar_perfil, name='api_editar_perfil'),

    # ==========================================================================
    # API REST — Catálogo y Productos
    # ==========================================================================
    path('api/productos/', views.api_productos, name='api_productos'),
    path('api/categorias/', views.api_categorias, name='api_categorias'),
    path('api/tasa/', views.api_tasa, name='api_tasa'),

    # ==========================================================================
    # API REST — Carrito y Pedidos de Catálogo
    # ==========================================================================
    path('api/guardar-pedido-catalogo/', views.finalizar_pedido_catalogo, name='api_finalizar_catalogo'),
    path('api/comprar-producto/<int:producto_id>/', views.comprar_producto, name='api_comprar_producto'),

    # ==========================================================================
    # API REST — Importaciones
    # ==========================================================================
    path('api/guardar-importacion/', views.api_guardar_importacion, name='api_guardar_importacion'),
    path('api/importaciones/<str:codigo>/', views.api_importacion_detalle, name='api_importacion_detalle'),

    # ==========================================================================
    # API REST — Órdenes de Servicio (Rastreo y Reparaciones)
    # ==========================================================================
    path('api/ordenes/', views.api_ordenes, name='api_ordenes'),
    path('api/ordenes/<str:codigo>/', views.api_ordenes, name='api_orden_detalle'),
    path('api/solicitar-reparacion/', views.api_solicitar_reparacion, name='api_solicitar_reparacion'),
    path('api/responder-presupuesto/', views.api_responder_presupuesto, name='api_responder_presupuesto'),

    # ==========================================================================
    # API REST — Pagos
    # ==========================================================================
    path('api/pagos/registrar/', views.api_registrar_pago, name='api_registrar_pago'),
]
