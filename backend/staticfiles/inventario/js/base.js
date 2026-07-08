function abrirModalLogin() {
    var overlay = document.getElementById('login-modal-overlay');
    if (overlay) overlay.classList.add('active');
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function safeUrl(url) {
    if (!url) return '#';
    const trimmed = String(url).trim();
    const lower = trimmed.toLowerCase();
    if (trimmed.startsWith('/') || trimmed.startsWith('.') || trimmed.startsWith('#')) {
        return trimmed;
    }
    if (lower.startsWith('http://') || lower.startsWith('https://')) {
        return trimmed;
    }
    if (lower.startsWith('javascript:') || lower.startsWith('data:')) {
        return '#';
    }
    return 'https://' + trimmed;
}

function showToast(message, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    const icons = { success: 'bi-check-circle-fill', error: 'bi-exclamation-circle-fill', info: 'bi-info-circle-fill', warning: 'bi-exclamation-triangle-fill' };
    toast.className = 'toast toast-' + type;
    toast.innerHTML = '<i class="bi ' + (icons[type] || icons.info) + '"></i> ' + message;
    container.appendChild(toast);
    setTimeout(function () { if (toast.parentNode) toast.remove(); }, 4000);
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').then(function (registration) {
            console.log('ServiceWorker registrado con éxito.');
        }).catch(function (err) {
            console.log('Fallo al registrar el ServiceWorker: ', err);
        });
    });
}

document.addEventListener("DOMContentLoaded", function () {
    var menuToggle = document.getElementById("btn-menu-responsive");
    var navLinks = document.getElementById("menu-navegacion");
    if (menuToggle && navLinks) {
        var iconoMenu = menuToggle.querySelector("i");

        menuToggle.addEventListener("click", function() {
            navLinks.classList.toggle("active");
            
            if(navLinks.classList.contains("active")) {
                iconoMenu.classList.remove("bi-list");
                iconoMenu.classList.add("bi-x-lg");
            } else {
                iconoMenu.classList.remove("bi-x-lg");
                iconoMenu.classList.add("bi-list");
            }
        });
    }

    /* Scroll to top */
    var scrollBtn = document.getElementById("scroll-top-btn");
    if (scrollBtn) {
        window.addEventListener("scroll", function () {
            if (window.scrollY > 400) {
                scrollBtn.classList.add("visible");
            } else {
                scrollBtn.classList.remove("visible");
            }
        });
        scrollBtn.addEventListener("click", function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    var observerOptions = {
        root: null,
        rootMargin: '0px 0px -8% 0px',
        threshold: 0.12
    };

    var observer = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    var fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach(function (el) { observer.observe(el); });

    /* Login modal */
    var loginBtn = document.getElementById('btn-login-modal');
    var loginOverlay = document.getElementById('login-modal-overlay');
    var loginClose = document.getElementById('login-modal-close');
    var loginForm = document.getElementById('login-modal-form');
    var loginError = document.getElementById('login-modal-error');
    if (loginBtn && loginOverlay) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            loginOverlay.classList.add('active');
        });
        function closeLoginModal() { loginOverlay.classList.remove('active'); if (loginError) loginError.style.display = 'none'; }
        if (loginClose) loginClose.addEventListener('click', closeLoginModal);
        loginOverlay.addEventListener('click', function(e) { if (e.target === loginOverlay) closeLoginModal(); });
        document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && loginOverlay.classList.contains('active')) closeLoginModal(); });
    }
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            var formData = new FormData(loginForm);
            loginForm.querySelector('.btn-submit').classList.add('btn-loading');
            fetch(loginForm.action, {
                method: 'POST',
                body: new URLSearchParams(formData),
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            }).then(function(r) { return r.json(); }).then(function(data) {
                loginForm.querySelector('.btn-submit').classList.remove('btn-loading');
                if (data.success) {
                    window.location.href = loginForm.dataset.next || '/perfil/';
                } else {
                    loginError.style.display = 'flex';
                    loginError.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> ' + (data.error || 'Credenciales inválidas');
                }
            }).catch(function() {
                loginForm.querySelector('.btn-submit').classList.remove('btn-loading');
                loginError.style.display = 'flex';
                loginError.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Error de conexión';
            });
        });
    }
});
