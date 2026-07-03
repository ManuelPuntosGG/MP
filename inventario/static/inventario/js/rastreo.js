function switchTab(tabId) {
    ['content-rastreo', 'content-ingreso', 'btn-rastreo', 'btn-ingreso'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });

    var contentEl = document.getElementById('content-' + tabId);
    var btnEl = document.getElementById('btn-' + tabId);
    
    if (contentEl) contentEl.classList.add('active');
    if (btnEl) btnEl.classList.add('active');
}

document.addEventListener("DOMContentLoaded", function() {
    var errorsHook = document.getElementById('errors-hook');
    if (errorsHook && errorsHook.dataset.hasErrors === 'true') {
        switchTab('ingreso');
    }

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
    var timelineImages = document.querySelectorAll('.timeline-img');
    var closeBtn = document.querySelector('.lightbox-close');

    timelineImages.forEach(function(img) {
        img.addEventListener('click', function() {
            lightbox.style.display = "block";
            lightboxImg.src = this.src;
        });
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            lightbox.style.display = "none";
        });
    }

    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox) {
            lightbox.style.display = "none";
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === "Escape" && lightbox.style.display === "block") {
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
                        resultadoCard.innerHTML = newCard.innerHTML;
                    } else if (newError) {
                        /* ticket no longer found — reload page */
                        location.reload();
                    }
                })
                .catch(function() { /* silent fail */ });
        }, 30000);
    }
});
