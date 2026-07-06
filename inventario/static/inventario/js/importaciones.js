const TARIFA_LIBRA = 9.00;
const COMISION_MINIMA = 5.00;
const STORAGE_KEY = 'mp_tech_carrito';

const TASA_VES = parseFloat(document.getElementById('tasa-ves-data')?.value || 0);
let carritoProductos = [];

function guardarCarrito() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(carritoProductos));
    } catch (e) { /* storage full or unavailable */ }
}

function restaurarCarrito() {
    try {
        var saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            var parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                carritoProductos = parsed;
                renderizarTabla();
            }
        }
    } catch (e) { /* ignore */ }
}

function limpiarCarrito() {
    if (carritoProductos.length === 0) return;
    if (!confirm('¿Estás seguro de limpiar toda la lista de cotización?')) return;
    carritoProductos = [];
    localStorage.removeItem(STORAGE_KEY);
    renderizarTabla();
    if (typeof showToast === 'function') {
        showToast('Lista de cotización limpiada', 'info');
    }
}

function detectarTienda(url) {
    let urlLower = url.toLowerCase();
    if (urlLower.includes("amazon")) return "Amazon";
    if (urlLower.includes("aliexpress")) return "AliExpress";
    if (urlLower.includes("ebay")) return "eBay";
    return "Otro";
}

function agregarProducto() {
    const inputUrl = document.getElementById('url-producto');
    const inputPrecio = document.getElementById('precio-producto');
    const inputPeso = document.getElementById('peso-producto');

    const url = inputUrl.value.trim();
    const precio = parseFloat(inputPrecio.value) || 0;
    const peso = parseInt(inputPeso.value, 10) || 1;

    if (!url) {
        if (typeof showToast === 'function') { showToast('Ingresa un enlace de producto válido', 'error'); }
        else { alert('Por favor, ingresa un enlace de producto válido.'); }
        return;
    }
    if (precio <= 0) {
        if (typeof showToast === 'function') { showToast('El precio debe ser mayor a 0', 'error'); }
        else { alert('Por favor, ingresa un precio mayor a 0.'); }
        return;
    }
    if (peso <= 0) {
        if (typeof showToast === 'function') { showToast('El peso debe ser superior a 0 Lbs', 'error'); }
        else { alert('El peso estimado debe ser superior a 0 Lbs.'); }
        return;
    }

    const nuevoItem = {
        id: Date.now(),
        tienda: detectarTienda(url),
        url: url,
        precio: precio,
        peso: peso
    };

    carritoProductos.push(nuevoItem);
    renderizarTabla();
    guardarCarrito();

    inputUrl.value = '';
    inputPrecio.value = '';
    inputPeso.value = '1.0';
    inputUrl.focus();
}

function renderizarTabla() {
    const tbody = document.getElementById('items-carrito');
    
    // Remover todas las filas de productos existentes (clase .fila-producto)
    const filasProductos = tbody.querySelectorAll('.fila-producto');
    filasProductos.forEach(f => f.remove());

    const filaVacia = document.getElementById('fila-vacia');

    if (carritoProductos.length === 0) {
        if (filaVacia) filaVacia.style.display = 'table-row';
        actualizarTotales();
        return;
    }

    if (filaVacia) filaVacia.style.display = 'none';

    carritoProductos.forEach((item) => {
        let fleteItem = item.peso * TARIFA_LIBRA;
        let fleteItemBs = fleteItem * TASA_VES;
        let badgeClass = `bg-${item.tienda.toLowerCase()}`;
        let sanitizedUrl = escapeHTML(safeUrl(item.url));

        let fila = document.createElement('tr');
        fila.className = 'fila-producto';
        fila.innerHTML = `
            <td data-label="Tienda"><span class="badge-tienda ${badgeClass}">${item.tienda}</span></td>
            <td data-label="Artículo">
                <a href="${sanitizedUrl}" target="_blank" class="link-articulo" title="${sanitizedUrl}">
                    <i class="bi bi-box-arrow-up-right"></i> Ver Artículo
                </a>
            </td>
            <td data-label="Precio ($)" class="text-center">
                <input type="number" step="0.01" class="input-tabla" value="${item.precio.toFixed(2)}" onchange="modificarItem(${item.id}, 'precio', this.value)">
            </td>
            <td data-label="Peso (Lbs)" class="text-center">
                <input type="number" step="1" class="input-tabla" value="${item.peso.toFixed(1)}" onchange="modificarItem(${item.id}, 'peso', this.value)">
            </td>
            <td data-label="Flete Est. ($ / Bs)" class="flete-celda">
                $${fleteItem.toFixed(2)}
                <span class="flete-ves-subtexto">${fleteItemBs.toFixed(2)} Bs</span>
            </td>
            <td>
                <button class="btn-eliminar" onclick="eliminarItem(${item.id})" title="Remover artículo"><i class="bi bi-trash3-fill"></i></button>
            </td>
        `;
        tbody.appendChild(fila);
    });

    actualizarTotales();
}

function modificarItem(id, propiedad, valor) {
    let numValue = propiedad === 'peso' ? (parseInt(valor, 10) || 1) : (parseFloat(valor) || 0);
    if (numValue <= 0) numValue = propiedad === 'peso' ? 1 : 0.01;
    
    let item = carritoProductos.find(p => p.id === id);
    if (item) {
        item[propiedad] = numValue;
        renderizarTabla();
        guardarCarrito();
    }
}

function eliminarItem(id) {
    carritoProductos = carritoProductos.filter(p => p.id !== id);
    renderizarTabla();
    guardarCarrito();
}

function actualizarTotales() {
    let totalFob = 0;
    let totalFlete = 0;

    carritoProductos.forEach(item => {
        totalFob += item.precio;
        totalFlete += (item.peso * TARIFA_LIBRA);
    });

    let porcentajeComision = 0.10;
    if (totalFob >= 200 && totalFob <= 1000) {
        porcentajeComision = 0.075;
    } else if (totalFob > 1000) {
        porcentajeComision = 0.05;
    }

    let totalComision = 0;
    if (carritoProductos.length > 0) {
        totalComision = Math.max(totalFob * porcentajeComision, COMISION_MINIMA);
    }

    let totalGeneral = totalFob + totalFlete + totalComision;
    let inicial50 = totalGeneral / 2;

    let totalFobBs = totalFob * TASA_VES;
    let totalFleteBs = totalFlete * TASA_VES;
    let totalComisionBs = totalComision * TASA_VES;
    let totalGeneralBs = totalGeneral * TASA_VES;
    let inicial50Bs = inicial50 * TASA_VES;

    document.getElementById('label-comision').innerText = `Gestión Administrativa y Seguro Operativo (${(porcentajeComision * 100).toFixed(1)}%):`;

    document.getElementById('resumen-fob').innerHTML = `<span>$${totalFob.toFixed(2)}</span><span class="bs-subtexto">${totalFobBs.toFixed(2)} Bs</span>`;
    document.getElementById('resumen-flete').innerHTML = `<span>$${totalFlete.toFixed(2)}</span><span class="bs-subtexto">${totalFleteBs.toFixed(2)} Bs</span>`;
    document.getElementById('resumen-comision').innerHTML = `<span>$${totalComision.toFixed(2)}</span><span class="bs-subtexto">${totalComisionBs.toFixed(2)} Bs</span>`;
    document.getElementById('resumen-total-usd').innerHTML = `<span>$${totalGeneral.toFixed(2)}</span><span class="bs-subtexto-total">${totalGeneralBs.toFixed(2)} Bs</span>`;
    
    document.getElementById('pago-inicial').innerText = `$${inicial50.toFixed(2)} (${inicial50Bs.toFixed(2)} Bs)`;
    document.getElementById('pago-final-entrega').innerText = `$${inicial50.toFixed(2)} (${inicial50Bs.toFixed(2)} Bs)`;

    const telefonoMTech = "584245022292";
    let lineasMensaje = [
        "¡Hola *MP Tech*!",
        "",
        "Me gustaría solicitar la cotización formal e importación de los siguientes artículos:",
        ""
    ];
    
    carritoProductos.forEach((item, i) => {
        let itemPrecioBs = item.precio * TASA_VES;
        lineasMensaje.push(`📦 *Artículo #${i+1}* (${item.tienda})`);
        lineasMensaje.push(`🔗 *Link:* ${item.url}`);
        lineasMensaje.push(`💵 *Precio:* $${item.precio.toFixed(2)} (~${itemPrecioBs.toFixed(2)} Bs) | ⚖️ *Peso:* ${item.peso.toFixed(1)} Lbs`);
        lineasMensaje.push("");
    });

    lineasMensaje.push("----------------------------------");
    lineasMensaje.push("📊 *DESGLOSE ESTIMADO DEL PEDIDO:*");
    lineasMensaje.push(`🔹 *Valor total productos:* $${totalFob.toFixed(2)} (${totalFobBs.toFixed(2)} Bs)`);
    lineasMensaje.push(`🔹 *Flete aéreo consolidado:* $${totalFlete.toFixed(2)} (${totalFleteBs.toFixed(2)} Bs)`);
    lineasMensaje.push(`🔹 *Gestión y seguro corporativo (${(porcentajeComision * 100).toFixed(1)}%):* $${totalComision.toFixed(2)} (${totalComisionBs.toFixed(2)} Bs)`);
    lineasMensaje.push(`💰 *TOTAL GENERAL ESTIMADO:* *$${totalGeneral.toFixed(2)}* (*${totalGeneralBs.toFixed(2)} Bs*)`);
    lineasMensaje.push("");
    lineasMensaje.push(`💵 *Abono inicial (50% para comprar):* $${inicial50.toFixed(2)} (*${inicial50Bs.toFixed(2)} Bs*)`);
    lineasMensaje.push(`💵 *Monto al retirar (50% restante):* $${inicial50.toFixed(2)} (*${inicial50Bs.toFixed(2)} Bs*)`);
    lineasMensaje.push("");
    lineasMensaje.push(`📈 _Tarifa de cálculo aplicada: ${TASA_VES.toFixed(2)} Bs/$_`);
    lineasMensaje.push("");
    lineasMensaje.push("⚠️ _Acepto que los valores son estimados y la cotización final puede variar de acuerdo al pesaje y cubicaje definitivo medido en el almacén de origen._");

    let nombre = document.getElementById('user-nombre-data')?.value || '';
    let telefono = document.getElementById('user-telefono-data')?.value || '';
    if (nombre && telefono) {
        lineasMensaje.push("");
        lineasMensaje.push(`👤 *Nombre:* ${nombre}`);
        lineasMensaje.push(`📞 *Teléfono:* ${telefono}`);
    }

    let mensajeCodificado = encodeURIComponent(lineasMensaje.join("\n"));
    document.getElementById('btn-ws-import').href = `https://wa.me/${telefonoMTech}?text=${mensajeCodificado}`;
}

function validarEnvio(e) {
    if (carritoProductos.length === 0) {
        e.preventDefault();
        if (typeof showToast === 'function') {
            showToast('Agrega por lo menos un artículo antes de enviar', 'error');
        } else {
            alert('Agrega por lo menos un artículo antes de enviar la lista.');
        }
        return false;
    }
    
    var nombre = document.getElementById('user-nombre-data')?.value || '';
    var telefono = document.getElementById('user-telefono-data')?.value || '';
    if (!nombre) nombre = prompt("Tu nombre:");
    if (!telefono) telefono = prompt("Tu teléfono:");
    
    if (!nombre || !telefono) {
        e.preventDefault();
        if (typeof showToast === 'function') {
            showToast('Nombre y teléfono son requeridos para procesar la cotización', 'error');
        } else {
            alert('Nombre y teléfono son requeridos para procesar la cotización.');
        }
        return false;
    }
    
    var elNombre = document.getElementById('user-nombre-data');
    var elTelefono = document.getElementById('user-telefono-data');
    if (elNombre) elNombre.value = nombre;
    if (elTelefono) elTelefono.value = telefono;
    
    actualizarTotales();
    return true;
}

function getCSRFToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
}

function guardarPedidoImportacion() {
    if (carritoProductos.length === 0) return;
    var totalFob = carritoProductos.reduce(function(s, i) { return s + i.precio; }, 0);
    var totalFlete = carritoProductos.reduce(function(s, i) { return s + i.peso * TARIFA_LIBRA; }, 0);
    
    var porcentajeComision = 0.10;
    if (totalFob >= 200 && totalFob <= 1000) {
        porcentajeComision = 0.075;
    } else if (totalFob > 1000) {
        porcentajeComision = 0.05;
    }
    var totalComision = Math.max(totalFob * porcentajeComision, COMISION_MINIMA);
    var totalGeneral = totalFob + totalFlete + totalComision;
    
    var nombre = document.getElementById('user-nombre-data')?.value || '';
    var telefono = document.getElementById('user-telefono-data')?.value || '';
    fetch('/guardar-importacion/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCSRFToken() },
        body: JSON.stringify({ productos: carritoProductos, total_usd: totalGeneral, total_ves: totalGeneral * TASA_VES, nombre: nombre, telefono: telefono })
    }).then(function(r) { return r.json(); }).then(function(data) {
        if (data.success) {
            carritoProductos = [];
            localStorage.removeItem(STORAGE_KEY);
            renderizarTabla();
            if (typeof showToast === 'function') {
                showToast('Pedido de importación #' + data.codigo + ' registrado', 'success');
            }
        }
    }).catch(function() {});
}

document.addEventListener("DOMContentLoaded", function() {
    restaurarCarrito();
    var btnLimpiar = document.getElementById("btn-limpiar-lista");
    if (btnLimpiar) {
        btnLimpiar.addEventListener("click", limpiarCarrito);
    }
    var btnWs = document.getElementById("btn-ws-import");
    if (btnWs) {
        btnWs.addEventListener("click", function() {
            this.classList.add('btn-loading');
            setTimeout(function() {
                guardarPedidoImportacion();
                if (btnWs) btnWs.classList.remove('btn-loading');
            }, 500);
        });
    }
});
