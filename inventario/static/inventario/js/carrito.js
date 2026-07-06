document.addEventListener("DOMContentLoaded", function() {
    var cartSidebar = document.getElementById("cart-sidebar");
    var cartOverlay = document.getElementById("cart-overlay");
    var cartToggle = document.getElementById("cart-toggle");
    var cartCount = document.getElementById("cart-count");
    var cartItems = document.getElementById("cart-items");
    var cartTotal = document.getElementById("cart-total");
    var cartCheckout = document.getElementById("cart-checkout");

    if (!cartSidebar) return;

    function openCart() {
        cartSidebar.classList.add("open");
        cartOverlay.classList.add("visible");
        document.body.style.overflow = "hidden";
        renderCart();
    }

    function closeCart() {
        cartSidebar.classList.remove("open");
        cartOverlay.classList.remove("visible");
        document.body.style.overflow = "";
    }

    cartToggle.addEventListener("click", openCart);
    cartOverlay.addEventListener("click", closeCart);
    var cartCloseBtn = document.getElementById("cart-close");
    if (cartCloseBtn) cartCloseBtn.addEventListener("click", closeCart);

    function getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
    }

    function renderCart() {
        var carrito = [];
        try {
            carrito = JSON.parse(sessionStorage.getItem('mp_carrito') || '[]');
        } catch(e) {}

        if (carrito.length === 0) {
            cartItems.innerHTML = '<div class="cart-empty"><i class="bi bi-bag"></i><p>Tu carrito está vacío</p></div>';
            cartTotal.textContent = '$0.00';
            cartCount.textContent = '0';
            return;
        }

        var html = '';
        var total = 0;
        carrito.forEach(function(item) {
            var subtotal = item.precio * item.cantidad;
            total += subtotal;
            html += '<div class="cart-item" data-id="' + item.producto_id + '">';
            if (item.imagen && typeof item.imagen === 'string' && item.imagen.indexOf('/catalogo/') === -1) {
                html += '<img src="' + item.imagen + '" alt="' + item.nombre + '" class="cart-item-img">';
            } else {
                html += '<div class="cart-item-img-placeholder"><i class="bi bi-image"></i></div>';
            }
            html += '<div class="cart-item-info">';
            html += '<div class="cart-item-name">' + item.nombre + '</div>';
            html += '<div class="cart-item-price">$' + item.precio.toFixed(2) + '</div>';
            html += '<div class="cart-item-qty">';
            html += '<button class="cart-qty-btn" onclick="cambiarCantidad(' + item.producto_id + ', -1)">-</button>';
            html += '<span>' + item.cantidad + '</span>';
            html += '<button class="cart-qty-btn" onclick="cambiarCantidad(' + item.producto_id + ', 1)">+</button>';
            html += '</div></div>';
            html += '<button class="cart-item-remove" onclick="eliminarDelCarrito(' + item.producto_id + ')"><i class="bi bi-trash3"></i></button>';
            html += '</div>';
        });
        cartItems.innerHTML = html;
        cartTotal.textContent = '$' + total.toFixed(2);
        cartCount.textContent = carrito.length;
        actualizarBadge();
    }

    window.cambiarCantidad = function(productoId, delta) {
        var carrito = JSON.parse(sessionStorage.getItem('mp_carrito') || '[]');
        var item = carrito.find(function(i) { return i.producto_id === productoId; });
        if (item) {
            var nuevaCant = item.cantidad + delta;
            if (nuevaCant <= 0) {
                carrito = carrito.filter(function(i) { return i.producto_id !== productoId; });
            } else if (nuevaCant <= item.stock) {
                item.cantidad = nuevaCant;
            } else {
                showToast('Stock máximo: ' + item.stock, 'error');
                return;
            }
        }
        sessionStorage.setItem('mp_carrito', JSON.stringify(carrito));
        renderCart();
    };

    window.eliminarDelCarrito = function(productoId) {
        var carrito = JSON.parse(sessionStorage.getItem('mp_carrito') || '[]');
        carrito = carrito.filter(function(i) { return i.producto_id !== productoId; });
        sessionStorage.setItem('mp_carrito', JSON.stringify(carrito));
        renderCart();
    };

    window.comprarAhora = function(btn) {
        var productoId = parseInt(btn.dataset.id);
        var nombre = btn.dataset.name;
        var precio = parseFloat(btn.dataset.price) || 0;
        var nombreCliente = getNombreUsuario();
        var telefonoCliente = getTelefonoUsuario();
        if (!nombreCliente) nombreCliente = prompt("Tu nombre:");
        if (!telefonoCliente) telefonoCliente = prompt("Tu teléfono:");
        if (!nombreCliente || !telefonoCliente) {
            showToast('Nombre y teléfono son requeridos', 'error');
            return;
        }
        btn.classList.add('btn-loading');
        fetch('/comprar-producto/' + productoId + '/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
            body: JSON.stringify({ nombre: nombreCliente, telefono: telefonoCliente })
        }).then(function(r) { return r.json(); }).then(function(data) {
            if (data.success) {
                var msg = "¡Hola *MP Tech*!\n\nQuiero comprar el siguiente producto del catálogo:\n\n📦 *" + nombre + "*\n   Cantidad: 1 x $" + precio.toFixed(2) + "\n\n----------------------------------\n💰 *TOTAL:* $" + precio.toFixed(2) + "\n\n👤 *Nombre:* " + nombreCliente + "\n📞 *Teléfono:* " + telefonoCliente + "\n\n📍 *Código:* " + data.codigo;
                window.open("https://wa.me/584245022292?text=" + encodeURIComponent(msg), '_blank');
                showToast('Pedido #' + data.codigo + ' registrado', 'success');
            } else {
                showToast(data.error || 'Error al crear pedido', 'error');
            }
        }).catch(function() { showToast('Error de conexión', 'error'); })
        .finally(function() { btn.classList.remove('btn-loading'); });
    };

    window.agregarAlCarrito = function(btn) {
        var productoId = parseInt(btn.dataset.id);
        var nombre = btn.dataset.name;
        var precio = parseFloat(btn.dataset.price) || 0;
        var stock = parseInt(btn.dataset.stock, 10) || 0;
        var imagen = btn.dataset.img || '';
        var carrito = JSON.parse(sessionStorage.getItem('mp_carrito') || '[]');
        var existing = carrito.find(function(i) { return i.producto_id === productoId; });
        if (existing) {
            if (stock > 0 && existing.cantidad >= stock) {
                showToast('Stock máximo alcanzado (' + stock + ')', 'warning');
                return;
            }
            existing.cantidad += 1;
        } else {
            carrito.push({ producto_id: productoId, nombre: nombre, precio: precio, cantidad: 1, stock: stock, imagen: imagen });
            if (stock <= 0) {
                showToast(nombre + ' añadido (sin stock registrado)', 'warning');
            } else {
                showToast(nombre + ' añadido al carrito', 'success');
            }
        }
        sessionStorage.setItem('mp_carrito', JSON.stringify(carrito));
        renderCart();
        openCart();
    };

    function actualizarBadge() {
        var carrito = JSON.parse(sessionStorage.getItem('mp_carrito') || '[]');
        var count = carrito.length;
        cartCount.textContent = count;
    }
    actualizarBadge();

    function buildWhatsAppMensaje(carrito, total, nombre, telefono, codigo) {
        var lineas = [
            "¡Hola *MP Tech*!",
            "",
            "Quiero realizar el siguiente pedido del catálogo:",
            ""
        ];
        carrito.forEach(function(item, i) {
            lineas.push("📦 *Artículo #" + (i+1) + "*: " + item.nombre);
            lineas.push("   Cantidad: " + item.cantidad + " x $" + item.precio.toFixed(2));
            lineas.push("   Subtotal: $" + (item.precio * item.cantidad).toFixed(2));
            lineas.push("");
        });
        lineas.push("----------------------------------");
        lineas.push("💰 *TOTAL:* $" + total.toFixed(2));
        lineas.push("");
        lineas.push("👤 *Nombre:* " + nombre);
        lineas.push("📞 *Teléfono:* " + telefono);
        if (codigo) {
            lineas.push("📍 *Código:* " + codigo);
        }
        return lineas.join("\n");
    }

    function getNombreUsuario() {
        return document.getElementById('user-nombre-data')?.value || '';
    }

    function getTelefonoUsuario() {
        return document.getElementById('user-telefono-data')?.value || '';
    }

    cartCheckout.addEventListener("click", function() {
        var carrito = JSON.parse(sessionStorage.getItem('mp_carrito') || '[]');
        if (carrito.length === 0) {
            showToast('El carrito está vacío', 'error');
            return;
        }

        var nombre = getNombreUsuario();
        var telefono = getTelefonoUsuario();
        if (!nombre) nombre = prompt("Tu nombre:");
        if (!telefono) telefono = prompt("Tu teléfono:");
        if (!nombre || !telefono) {
            showToast('Nombre y teléfono son requeridos', 'error');
            return;
        }

        var total = carrito.reduce(function(sum, item) { return sum + item.precio * item.cantidad; }, 0);

        cartCheckout.classList.add('btn-loading');
        fetch('/guardar-pedido-catalogo/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
            body: JSON.stringify({ productos: carrito, total: total, nombre: nombre, telefono: telefono })
        }).then(function(r) { return r.json(); }).then(function(data) {
            if (data.success) {
                var mensaje = buildWhatsAppMensaje(carrito, total, nombre, telefono, data.codigo);
                var wsUrl = "https://wa.me/584245022292?text=" + encodeURIComponent(mensaje);
                window.open(wsUrl, '_blank');
                
                sessionStorage.setItem('mp_carrito', '[]');
                renderCart();
                showToast('Pedido #' + data.codigo + ' registrado', 'success');
                closeCart();
            } else {
                showToast(data.error || 'Error al crear pedido', 'error');
            }
        }).catch(function() {
            showToast('Error de conexión', 'error');
        })
        .finally(function() { cartCheckout.classList.remove('btn-loading'); });
    });
});
