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
    const menuToggle = document.getElementById("btn-menu-responsive");
    const navLinks = document.getElementById("menu-navegacion");
    if (menuToggle && navLinks) {
        const iconoMenu = menuToggle.querySelector("i");

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

    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -8% 0px',
        threshold: 0.12
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach(el => observer.observe(el));
});
