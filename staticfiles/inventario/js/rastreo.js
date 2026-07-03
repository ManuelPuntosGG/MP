function switchTab(tabId) {
    ['content-rastreo', 'content-ingreso', 'btn-rastreo', 'btn-ingreso'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });

    const contentEl = document.getElementById('content-' + tabId);
    const btnEl = document.getElementById('btn-' + tabId);
    
    if (contentEl) contentEl.classList.add('active');
    if (btnEl) btnEl.classList.add('active');
}

document.addEventListener("DOMContentLoaded", function() {
    const errorsHook = document.getElementById('errors-hook');
    if (errorsHook && errorsHook.dataset.hasErrors === 'true') {
        switchTab('ingreso');
    }

    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function() {
            const btn = this.querySelector('.btn-submit');
            if(btn) {
                btn.style.width = btn.offsetWidth + 'px'; 
                btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Procesando...';
                btn.style.opacity = '0.7';
                btn.style.pointerEvents = 'none';
            }
        });
    });

    const lightbox = document.getElementById("imageLightbox");
    const lightboxImg = document.getElementById("lightboxImage");
    const timelineImages = document.querySelectorAll('.timeline-img');
    const closeBtn = document.querySelector('.lightbox-close');

    timelineImages.forEach(img => {
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
});
