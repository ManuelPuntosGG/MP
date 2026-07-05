document.addEventListener("DOMContentLoaded", function() {
    var grid = document.getElementById("catalogo-grid");
    if (!grid) return;

    var viewBtns = document.querySelectorAll(".view-toggle button");
    viewBtns.forEach(function(btn) {
        btn.addEventListener("click", function() {
            viewBtns.forEach(function(b) { b.classList.remove("active"); });
            this.classList.add("active");
            if (this.dataset.view === "list") {
                grid.classList.add("list-view");
            } else {
                grid.classList.remove("list-view");
            }
        });
    });

    var sortBtns = document.querySelectorAll(".sort-btn");
    sortBtns.forEach(function(btn) {
        btn.addEventListener("click", function() {
            sortBtns.forEach(function(b) { b.classList.remove("active"); });
            this.classList.add("active");
            var sort = this.dataset.sort;
            var cards = Array.from(grid.querySelectorAll(".tarjeta-producto"));
            if (sort === "default") {
                cards.sort(function(a, b) { return a.dataset.index - b.dataset.index; });
            } else if (sort === "price-asc") {
                cards.sort(function(a, b) { return parseFloat(a.dataset.price) - parseFloat(b.dataset.price); });
            } else if (sort === "price-desc") {
                cards.sort(function(a, b) { return parseFloat(b.dataset.price) - parseFloat(a.dataset.price); });
            }
            cards.forEach(function(card) { grid.appendChild(card); });
        });
    });

    var cards = Array.from(grid.querySelectorAll(".tarjeta-producto"));
    cards.forEach(function(card, idx) { card.dataset.index = idx; });
});
