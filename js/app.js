(() => {
  "use strict";

  const state = {
    page: 1,
    limit: 12,
    sort: "default",
    search: "",
    brands: new Set(),
    res: new Set(),
    type: "all",
    priceMin: null,
    priceMax: null,
    cart: loadJSON("optics_cart", []),
    wishlist: loadJSON("optics_wishlist", []),
  };

  const el = {
    grid: document.getElementById("product-grid"),
    meta: document.getElementById("catalog-meta"),
    pagination: document.getElementById("pagination"),
    brandsFilter: document.getElementById("filter-brands"),
    brandsGrid: document.getElementById("brands-grid"),
    reviewsGrid: document.getElementById("reviews-grid"),
    sort: document.getElementById("sort-select"),
    limit: document.getElementById("limit-select"),
    searchForm: document.getElementById("search-form"),
    searchInput: document.getElementById("search-input"),
    cartCount: document.getElementById("cart-count"),
    wishlistCount: document.getElementById("wishlist-count"),
    cartBtn: document.getElementById("cart-btn"),
    drawer: document.getElementById("cart-drawer"),
    cartItems: document.getElementById("cart-items"),
    cartTotal: document.getElementById("cart-total"),
    toast: document.getElementById("toast"),
    burger: document.getElementById("burger"),
    catNav: document.getElementById("cat-nav"),
    priceMin: document.getElementById("price-min"),
    priceMax: document.getElementById("price-max"),
    applyPrice: document.getElementById("apply-price"),
    resetFilters: document.getElementById("reset-filters"),
    checkout: document.getElementById("checkout-btn"),
  };

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function formatPrice(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  function productIcon(brand) {
    // Simple monochrome placeholder — no real product photos
    const hue = [...brand].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    return `
      <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="g-${brand}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="hsl(${hue}, 35%, 45%)"/>
            <stop offset="100%" stop-color="hsl(${hue}, 40%, 25%)"/>
          </linearGradient>
        </defs>
        <rect x="28" y="35" width="64" height="50" rx="12" fill="url(#g-${brand})"/>
        <circle cx="60" cy="60" r="16" fill="none" stroke="#fff" stroke-width="3" opacity="0.9"/>
        <circle cx="60" cy="60" r="6" fill="#fff" opacity="0.85"/>
        <rect x="48" y="28" width="24" height="10" rx="3" fill="url(#g-${brand})"/>
      </svg>
    `;
  }

  function stars(rating) {
    const full = Math.round(rating);
    return "★".repeat(full) + "☆".repeat(5 - full);
  }

  /* ---------- Filters / sort ---------- */
  function getFiltered() {
    let list = [...PRODUCTS];

    if (state.search) {
      const q = state.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q)
      );
    }

    if (state.brands.size) {
      list = list.filter((p) => state.brands.has(p.brand));
    }

    if (state.res.size) {
      list = list.filter((p) => state.res.has(p.res));
    }

    if (state.type !== "all") {
      list = list.filter((p) => p.type === state.type);
    }

    if (state.priceMin != null && state.priceMin !== "") {
      list = list.filter((p) => p.price >= Number(state.priceMin));
    }
    if (state.priceMax != null && state.priceMax !== "") {
      list = list.filter((p) => p.price <= Number(state.priceMax));
    }

    switch (state.sort) {
      case "name-asc":
        list.sort((a, b) => a.name.localeCompare(b.name, "uk"));
        break;
      case "name-desc":
        list.sort((a, b) => b.name.localeCompare(a.name, "uk"));
        break;
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "rating-desc":
        list.sort((a, b) => b.rating - a.rating);
        break;
      default:
        list.sort((a, b) => (b.hit ? 1 : 0) - (a.hit ? 1 : 0));
    }

    return list;
  }

  function renderProducts() {
    const list = getFiltered();
    const total = list.length;
    const pages = Math.max(1, Math.ceil(total / state.limit));
    if (state.page > pages) state.page = pages;

    const start = (state.page - 1) * state.limit;
    const slice = list.slice(start, start + state.limit);

    if (!slice.length) {
      el.grid.innerHTML = `
        <div class="empty-state">
          <p>Нічого не знайдено. Спробуйте змінити фільтри або пошук.</p>
        </div>`;
    } else {
      el.grid.innerHTML = slice.map((p) => cardHTML(p)).join("");
    }

    const shownFrom = total ? start + 1 : 0;
    const shownTo = Math.min(start + state.limit, total);
    el.meta.textContent = `Показано ${shownFrom}–${shownTo} з ${total}`;

    renderPagination(pages);
    bindCardActions();
  }

  function cardHTML(p) {
    const wished = state.wishlist.includes(p.id);
    const badges = [
      p.sale ? `<span class="badge badge--sale">Знижка −${p.sale}%</span>` : "",
      p.hit ? `<span class="badge badge--hit">Хіт продажу</span>` : "",
      p.popular ? `<span class="badge badge--popular">Популярний</span>` : "",
    ].join("");

    return `
      <article class="product-card" data-id="${p.id}">
        <div class="product-card__badges">${badges}</div>
        <button type="button" class="product-card__wish ${wished ? "is-active" : ""}"
          data-wish="${p.id}" aria-label="У список побажань">${wished ? "♥" : "♡"}</button>
        <div class="product-card__img">${productIcon(p.brand)}</div>
        <div class="product-card__body">
          <div class="product-card__brand">${p.brand}</div>
          <a href="#" class="product-card__title" data-product="${p.id}">${p.name}</a>
          <div class="product-card__rating">
            <span class="stars">${stars(p.rating)}</span>
            <span>(${p.reviews})</span>
          </div>
          <div class="product-card__price">
            ${p.oldPrice ? `<span class="price-old">${formatPrice(p.oldPrice)} грн</span>` : ""}
            <span class="price-new ${p.oldPrice ? "has-sale" : ""}">${formatPrice(p.price)} грн</span>
          </div>
          <div class="product-card__actions">
            <button type="button" class="btn--buy" data-add="${p.id}">Купити</button>
          </div>
        </div>
      </article>
    `;
  }

  function renderPagination(pages) {
    if (pages <= 1) {
      el.pagination.innerHTML = "";
      return;
    }
    let html = "";
    html += `<button type="button" data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""}>‹</button>`;
    for (let i = 1; i <= pages; i++) {
      if (pages > 7 && Math.abs(i - state.page) > 2 && i !== 1 && i !== pages) {
        if (i === 2 || i === pages - 1) html += `<button type="button" disabled>…</button>`;
        continue;
      }
      html += `<button type="button" data-page="${i}" class="${i === state.page ? "is-active" : ""}">${i}</button>`;
    }
    html += `<button type="button" data-page="${state.page + 1}" ${state.page === pages ? "disabled" : ""}>›</button>`;
    el.pagination.innerHTML = html;

    el.pagination.querySelectorAll("[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = Number(btn.dataset.page);
        if (p >= 1 && p <= pages) {
          state.page = p;
          renderProducts();
          window.scrollTo({ top: el.grid.offsetTop - 80, behavior: "smooth" });
        }
      });
    });
  }

  function bindCardActions() {
    el.grid.querySelectorAll("[data-add]").forEach((btn) => {
      btn.addEventListener("click", () => addToCart(Number(btn.dataset.add)));
    });
    el.grid.querySelectorAll("[data-wish]").forEach((btn) => {
      btn.addEventListener("click", () => toggleWish(Number(btn.dataset.wish)));
    });
    el.grid.querySelectorAll("[data-product]").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const p = PRODUCTS.find((x) => x.id === Number(link.dataset.product));
        if (p) showToast(`${p.name} — демо-картка товару`);
      });
    });
  }

  /* ---------- Brand filters UI ---------- */
  function renderBrandFilters() {
    const inCatalog = [...new Set(PRODUCTS.map((p) => p.brand))].sort();
    el.brandsFilter.innerHTML = inCatalog
      .map(
        (b) => `
      <label class="check">
        <input type="checkbox" name="brand" value="${b}" ${state.brands.has(b) ? "checked" : ""} />
        ${b}
      </label>`
      )
      .join("");

    el.brandsFilter.querySelectorAll('input[name="brand"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) state.brands.add(input.value);
        else state.brands.delete(input.value);
        state.page = 1;
        renderProducts();
        syncBrandChips();
      });
    });
  }

  function renderBrandChips() {
    el.brandsGrid.innerHTML = BRANDS.map(
      (b) => `
      <button type="button" class="brand-chip" data-brand="${b}">
        <div class="brand-chip__logo">${b.slice(0, 3).toUpperCase()}</div>
        Тепловізори ${b}
      </button>`
    ).join("");

    el.brandsGrid.querySelectorAll("[data-brand]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const b = chip.dataset.brand;
        if (state.brands.has(b)) state.brands.delete(b);
        else state.brands.add(b);
        state.page = 1;
        renderBrandFilters();
        renderProducts();
        syncBrandChips();
      });
    });
    syncBrandChips();
  }

  function syncBrandChips() {
    el.brandsGrid.querySelectorAll("[data-brand]").forEach((chip) => {
      chip.classList.toggle("is-active", state.brands.has(chip.dataset.brand));
    });
  }

  function renderReviews() {
    el.reviewsGrid.innerHTML = REVIEWS.map(
      (r) => `
      <article class="review-card">
        <div class="review-card__thumb">◈</div>
        <div>
          <div class="review-card__product">${r.product}</div>
          <p class="review-card__text">${r.text}</p>
          <div class="review-card__meta">${r.author} · ${r.date}</div>
        </div>
      </article>`
    ).join("");
  }

  /* ---------- Cart ---------- */
  function addToCart(id) {
    const item = state.cart.find((c) => c.id === id);
    if (item) item.qty += 1;
    else state.cart.push({ id, qty: 1 });
    persistCart();
    const p = PRODUCTS.find((x) => x.id === id);
    showToast(`Додано: ${p ? p.name : "товар"}`);
  }

  function setQty(id, qty) {
    const item = state.cart.find((c) => c.id === id);
    if (!item) return;
    if (qty <= 0) state.cart = state.cart.filter((c) => c.id !== id);
    else item.qty = qty;
    persistCart();
    renderCart();
  }

  function persistCart() {
    saveJSON("optics_cart", state.cart);
    updateBadges();
    if (!el.drawer.hidden) renderCart();
  }

  function updateBadges() {
    const count = state.cart.reduce((s, c) => s + c.qty, 0);
    el.cartCount.textContent = count;
    el.wishlistCount.textContent = state.wishlist.length;
  }

  function renderCart() {
    if (!state.cart.length) {
      el.cartItems.innerHTML = `<div class="cart-empty">Кошик порожній</div>`;
      el.cartTotal.textContent = "0";
      return;
    }

    let total = 0;
    el.cartItems.innerHTML = state.cart
      .map((c) => {
        const p = PRODUCTS.find((x) => x.id === c.id);
        if (!p) return "";
        total += p.price * c.qty;
        return `
          <div class="cart-item">
            <div class="cart-item__img">${productIcon(p.brand)}</div>
            <div>
              <div class="cart-item__name">${p.name}</div>
              <div class="cart-item__price">${formatPrice(p.price)} грн</div>
              <div class="cart-item__qty">
                <button type="button" data-qty="${p.id}" data-d="-1">−</button>
                <span>${c.qty}</span>
                <button type="button" data-qty="${p.id}" data-d="1">+</button>
              </div>
            </div>
            <button type="button" class="cart-item__remove" data-remove="${p.id}" aria-label="Видалити">×</button>
          </div>`;
      })
      .join("");

    el.cartTotal.textContent = formatPrice(total);

    el.cartItems.querySelectorAll("[data-qty]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.qty);
        const item = state.cart.find((c) => c.id === id);
        if (item) setQty(id, item.qty + Number(btn.dataset.d));
      });
    });
    el.cartItems.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => setQty(Number(btn.dataset.remove), 0));
    });
  }

  function openCart() {
    el.drawer.hidden = false;
    document.body.style.overflow = "hidden";
    renderCart();
  }

  function closeCart() {
    el.drawer.hidden = true;
    document.body.style.overflow = "";
  }

  function toggleWish(id) {
    const i = state.wishlist.indexOf(id);
    if (i >= 0) state.wishlist.splice(i, 1);
    else state.wishlist.push(id);
    saveJSON("optics_wishlist", state.wishlist);
    updateBadges();
    renderProducts();
    showToast(i >= 0 ? "Прибрано зі списку побажань" : "Додано до побажань");
  }

  let toastTimer;
  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("is-visible"), 2200);
  }

  /* ---------- Events ---------- */
  function bindEvents() {
    el.sort.addEventListener("change", () => {
      state.sort = el.sort.value;
      state.page = 1;
      renderProducts();
    });

    el.limit.addEventListener("change", () => {
      state.limit = Number(el.limit.value);
      state.page = 1;
      renderProducts();
    });

    el.searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      state.search = el.searchInput.value.trim();
      state.page = 1;
      renderProducts();
    });

    el.searchInput.addEventListener("input", () => {
      // live search with light debounce
      clearTimeout(el.searchInput._t);
      el.searchInput._t = setTimeout(() => {
        state.search = el.searchInput.value.trim();
        state.page = 1;
        renderProducts();
      }, 250);
    });

    document.querySelectorAll('input[name="type"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) {
          state.type = input.value;
          state.page = 1;
          renderProducts();
        }
      });
    });

    document.querySelectorAll('input[name="res"]').forEach((input) => {
      input.addEventListener("change", () => {
        if (input.checked) state.res.add(input.value);
        else state.res.delete(input.value);
        state.page = 1;
        renderProducts();
      });
    });

    el.applyPrice.addEventListener("click", () => {
      state.priceMin = el.priceMin.value;
      state.priceMax = el.priceMax.value;
      state.page = 1;
      renderProducts();
    });

    el.resetFilters.addEventListener("click", () => {
      state.brands.clear();
      state.res.clear();
      state.type = "all";
      state.priceMin = null;
      state.priceMax = null;
      state.search = "";
      el.searchInput.value = "";
      el.priceMin.value = "";
      el.priceMax.value = "";
      document.querySelectorAll('input[name="type"]').forEach((i) => {
        i.checked = i.value === "all";
      });
      document.querySelectorAll('input[name="res"]').forEach((i) => {
        i.checked = false;
      });
      state.page = 1;
      renderBrandFilters();
      syncBrandChips();
      renderProducts();
      showToast("Фільтри скинуто");
    });

    el.cartBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openCart();
    });

    el.drawer.querySelectorAll("[data-close-cart]").forEach((n) => {
      n.addEventListener("click", closeCart);
    });

    el.checkout.addEventListener("click", () => {
      if (!state.cart.length) {
        showToast("Кошик порожній");
        return;
      }
      showToast("Це демо — оформлення замовлення не підключене");
      state.cart = [];
      persistCart();
      renderCart();
      closeCart();
    });

    el.burger.addEventListener("click", () => {
      el.catNav.classList.toggle("is-open");
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !el.drawer.hidden) closeCart();
    });
  }

  /* ---------- Init ---------- */
  function init() {
    renderBrandFilters();
    renderBrandChips();
    renderReviews();
    bindEvents();
    updateBadges();
    renderProducts();
  }

  init();
})();
