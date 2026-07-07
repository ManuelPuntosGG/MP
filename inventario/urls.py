from django.urls import path, reverse_lazy
from django.contrib.auth import views as auth_views
from inventario import views

app_name = 'inventario'

urlpatterns = [
    path('', views.inicio, name='inicio'),
    path('catalogo/', views.catalogo, name='catalogo'),
    path('rastreo/', views.rastrear_orden, name='rastrear_ticket'),
    path('solicitar/', views.solicitar_reparacion, name='solicitar_reparacion'),
    path('rastreo/presupuesto/<int:pk>/<str:accion>/', views.responder_presupuesto, name='responder_presupuesto'),
    path('imprimir-ticket/<int:pk>/', views.imprimir_ticket, name='imprimir_ticket'),
    path('importaciones/', views.cotizador_auto, name='cotizador_auto'),
    # Autenticación
    path('registro/', views.registrar_cliente, name='registrar_cliente'),
    path('login/', views.iniciar_sesion, name='iniciar_sesion'),
    path('logout/', views.cerrar_sesion, name='cerrar_sesion'),
    path('perfil/', views.perfil_cliente, name='perfil_cliente'),
    path('perfil/editar/', views.perfil_editar, name='perfil_editar'),
    path('password-reset/', auth_views.PasswordResetView.as_view(template_name='password_reset.html', email_template_name='password_reset_email.html', success_url=reverse_lazy('inventario:password_reset_done')), name='password_reset'),
    path('password-reset/done/', auth_views.PasswordResetDoneView.as_view(template_name='password_reset_done.html'), name='password_reset_done'),
    path('password-reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(template_name='password_reset_confirm.html', success_url=reverse_lazy('inventario:password_reset_complete')), name='password_reset_confirm'),
    path('password-reset/complete/', auth_views.PasswordResetCompleteView.as_view(template_name='password_reset_complete.html'), name='password_reset_complete'),
    # Carrito
    path('guardar-pedido-catalogo/', views.finalizar_pedido_catalogo, name='finalizar_catalogo'),
    path('comprar-producto/<int:producto_id>/', views.comprar_producto, name='comprar_producto'),
    # Pedidos
    path('guardar-importacion/', views.guardar_pedido_importacion, name='guardar_importacion'),
    path('importacion/<int:pk>/', views.detalle_importacion, name='detalle_importacion'),
    # Dashboard
    path('dashboard/', views.dashboard, name='dashboard'),
    # API
    path('api/productos/', views.api_productos, name='api_productos'),
    path('api/categorias/', views.api_categorias, name='api_categorias'),
    path('api/tasa/', views.api_tasa, name='api_tasa'),
    path('api/ordenes/', views.api_ordenes, name='api_ordenes'),
    path('api/ordenes/<str:codigo>/', views.api_ordenes, name='api_orden_detalle'),
]
