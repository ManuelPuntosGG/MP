function copiarCodigo() {
    const codigo = document.getElementById("codigo-texto").innerText;
    const icono = document.getElementById("icono-copiar");
    
    navigator.clipboard.writeText(codigo).then(() => {
        icono.classList.remove("bi-clipboard");
        icono.classList.add("bi-check2");
        icono.style.color = "var(--verde-precio)";
        
        setTimeout(() => {
            icono.classList.remove("bi-check2");
            icono.classList.add("bi-clipboard");
            icono.style.color = "";
        }, 2000);
    });
}

function copiarDatosReor(btn) {
    const datosTexto = "Receptor: Manuel García\nCédula: V-29685051\nTeléfono: 04245022292\nDestino: Valencia";
    navigator.clipboard.writeText(datosTexto).then(() => {
        const contenidoOriginal = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check-lg"></i> ¡Copiado!';
        btn.style.color = "#10b981";
        btn.style.borderColor = "#10b981";
        
        setTimeout(() => {
            btn.innerHTML = contenidoOriginal;
            btn.style.color = "";
            btn.style.borderColor = "";
        }, 2000);
    });
}

document.addEventListener("DOMContentLoaded", function() {
    const telefonoMTech = "584245022292"; 
    
    const codigoRastreo = document.getElementById("codigo-texto")?.innerText || "";
    const clienteNombre = document.getElementById("cliente-nombre-data")?.value || "";
    const equipoNombre = document.getElementById("equipo-nombre-data")?.value || "";
    
    const mensaje = `Hola MP Tech, acabo de registrar una solicitud de soporte técnico. Código: ${codigoRastreo}, Cliente: ${clienteNombre}, Equipo: ${equipoNombre}`;
    
    const wsBtn = document.getElementById("btn-whatsapp-ticket");
    if (wsBtn) {
        wsBtn.href = `https://wa.me/${telefonoMTech}?text=${encodeURIComponent(mensaje)}`;
    }

    const headers = document.querySelectorAll(".grupo-opciones-entrega .acordeon-header");
    
    headers.forEach(header => {
        header.addEventListener("click", function() {
            const currentContent = this.nextElementSibling;
            const isCurrentlyActive = this.classList.contains("active");

            headers.forEach(h => {
                h.classList.remove("active");
                h.nextElementSibling.style.maxHeight = null;
            });

            if (!isCurrentlyActive) {
                this.classList.add("active");
                currentContent.style.maxHeight = currentContent.scrollHeight + "px";
            }
        });
    });
});
