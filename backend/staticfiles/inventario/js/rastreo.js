function toggleSolicitarForm() {
    var el = document.getElementById('content-solicitar');
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

document.addEventListener("DOMContentLoaded", function() {
    document.querySelectorAll('form').forEach(function(form) {
        form.addEventListener('submit', function() {
            var btn = this.querySelector('.btn-submit');
            if (btn) {
                btn.style.width = btn.offsetWidth + 'px'; 
                btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Procesando...';
                btn.style.opacity = '0.7';
                btn.style.pointerEvents = 'none';
            }
        });
    });

    var lightbox = document.getElementById("imageLightbox");
    var lightboxImg = document.getElementById("lightboxImage");
    var closeBtn = document.querySelector('.lightbox-close');

    // Usar delegación de eventos para soportar refresco dinámico de la tarjeta
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('timeline-img')) {
            lightbox.style.display = "block";
            lightboxImg.src = e.target.src;
        }
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            lightbox.style.display = "none";
        });
    }

    if (lightbox) {
        lightbox.addEventListener('click', function(e) {
            if (e.target === lightbox) {
                lightbox.style.display = "none";
            }
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === "Escape" && lightbox && lightbox.style.display === "block") {
            lightbox.style.display = "none";
        }
    });

    /* Auto-refresh: poll the same URL every 30s when a ticket is shown */
    var resultadoCard = document.querySelector('.resultado-card');
    if (resultadoCard) {
        var currentUrl = window.location.href;
        setInterval(function() {
            fetch(currentUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
                .then(function(r) { return r.text(); })
                .then(function(html) {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(html, 'text/html');
                    var newCard = doc.querySelector('.resultado-card');
                    var newError = doc.querySelector('.alert-box');
                    if (newCard) {
                        resultadoCard.style.transition = 'opacity 0.25s ease-in-out';
                        resultadoCard.style.opacity = '0.3';
                        setTimeout(function() {
                            resultadoCard.innerHTML = newCard.innerHTML;
                            resultadoCard.style.opacity = '1';
                        }, 250);
                    } else if (newError) {
                        /* ticket no longer found — reload page */
                        location.reload();
                    }
                })
                .catch(function() { /* silent fail */ });
        }, 30000);
    }
});
