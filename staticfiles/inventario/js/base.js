function showToast(message, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    const icons = { success: 'bi-check-circle-fill', error: 'bi-exclamation-circle-fill', info: 'bi-info-circle-fill' };
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
});
