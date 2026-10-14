(() => {
  "use strict";

  const CONFIG = Object.assign(
    { sheetUrl: "", dataUrl: "data/watches.json", contacts: [], reserveHours: 48, reserveDeposit: 10000, city: "" },
    window.GW_CONFIG || {}
  );

  const STATUS = {
    available: { label: "В наличии", cls: "available" },
    reserved: { label: "Забронировано", cls: "reserved" },
    sold: { label: "Продано", cls: "sold" },
  };

  const state = {
    watches: [],
    filters: { collection: "", price: "", size: "", papers: false, sort: "new" },
  };

  const $ = (sel, root = document) => root.querySelector(sel);

  const esc = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const priceFmt = new Intl.NumberFormat("ru-RU");
  const formatPrice = (p) => (p > 0 ? `${priceFmt.format(p)} ₽` : "Цена по запросу");

  const depositText = () => formatPrice(CONFIG.reserveDeposit).replace(/ /g, "\u00a0");

  const setLabel = (w) => (w.box && w.papers ? "Полный комплект" : w.papers ? "С документами" : w.box ? "С коробкой" : "Без комплекта");

  // ---------- Data ----------

  // Приводим данные к одному виду: позже они будут приходить из Google Таблицы,
  // где поля могут быть строками ("да", "1 450 000").
  function normalize(raw, index) {
    const toBool = (v) => v === true || /^(да|yes|true|1|\+)$/i.test(String(v ?? "").trim());
    const toNum = (v) => Number(String(v ?? "").replace(/[^\d.]/g, "")) || 0;
    const photos = Array.isArray(raw.photos)
      ? raw.photos
      : String(raw.photos ?? "").split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    const status = STATUS[raw.status] ? raw.status : "available";
    return {
      ...raw,
      id: String(raw.id ?? `W-${index + 1}`),
      price: toNum(raw.price),
      year: raw.year ? String(raw.year) : "",
      diameter: toNum(raw.diameter),
      box: toBool(raw.box),
      papers: toBool(raw.papers),
      featured: toBool(raw.featured),
      photos,
      status,
      order: index,
    };
  }

  async function fetchJSON(url, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { cache: "no-cache", signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : data.watches || [];
    } finally {
      clearTimeout(timer);
    }
  }

  // Сначала живой каталог из Google Таблицы, при ошибке — копия из репозитория.
  async function loadWatches() {
    if (CONFIG.sheetUrl) {
      try {
        return (await fetchJSON(CONFIG.sheetUrl, 8000)).map(normalize);
      } catch (err) {
        console.warn("Таблица недоступна, показываю копию каталога", err);
      }
    }
    return (await fetchJSON(CONFIG.dataUrl, 15000)).map(normalize);
  }

  // ---------- Telegram ----------

  function tgLink(contact, text) {
    const base = `https://t.me/${encodeURIComponent(contact.username)}`;
    return text ? `${base}?text=${encodeURIComponent(text)}` : base;
  }

  function watchUrl(w) {
    return `${location.origin}${location.pathname}#w/${encodeURIComponent(w.id)}`;
  }

  function reserveText(w) {
    const ref = w.reference ? ` ${w.reference}` : "";
    return `Здравствуйте! Хочу забронировать часы ${w.brand} ${w.model}${ref} (${w.id}), ${formatPrice(w.price)}.\n${watchUrl(w)}`;
  }

  // ---------- Placeholder art ----------

  // Пока нет фото, рисуем аккуратный циферблат в цветах модели.
  function dialSVG(w) {
    const dial = w.dialColor || "#1b1d1c";
    const bezel = w.bezelColor || "#c9cdd2";
    const light = isLight(dial);
    const mark = light ? "#2a2c2b" : "#e9e6df";
    const id = `g${String(w.id).replace(/\W/g, "")}`;

    let bezelEl = `<circle cx="100" cy="100" r="78" fill="${esc(bezel)}"/>`;
    if (bezel.startsWith("split:")) {
      const [, a, b] = bezel.split(":");
      bezelEl = `<path d="M22 100a78 78 0 0 1 156 0z" fill="${esc(b)}"/><path d="M22 100a78 78 0 0 0 156 0z" fill="${esc(a)}"/>`;
    } else if (bezel === "fluted") {
      bezelEl = `<circle cx="100" cy="100" r="78" fill="#d9d4c7"/>` +
        Array.from({ length: 60 }, (_, i) => `<rect x="99" y="22" width="2" height="12" fill="#b9b2a2" transform="rotate(${i * 6} 100 100)"/>`).join("");
    }

    const indices = Array.from({ length: 12 }, (_, i) => {
      const big = i % 3 === 0;
      return `<rect x="${big ? 97 : 98.2}" y="${big ? 38 : 39}" width="${big ? 6 : 3.6}" height="${big ? 13 : 10}" rx="1" fill="${mark}" transform="rotate(${i * 30} 100 100)"/>`;
    }).join("");

    return `<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(w.brand + " " + w.model)}">
      <defs>
        <radialGradient id="${id}d" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="${esc(dial)}" stop-opacity=".82"/><stop offset="1" stop-color="${esc(dial)}"/></radialGradient>
        <linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1f2f3"/><stop offset=".5" stop-color="#b9bdc2"/><stop offset="1" stop-color="#e3e5e7"/></linearGradient>
        <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#a9adb2"/><stop offset=".5" stop-color="#eceef0"/><stop offset="1" stop-color="#a9adb2"/></linearGradient>
      </defs>
      <rect x="70" y="-10" width="60" height="50" rx="6" fill="url(#${id}b)"/>
      <rect x="70" y="160" width="60" height="90" rx="6" fill="url(#${id}b)"/>
      <rect x="176" y="92" width="10" height="16" rx="3" fill="url(#${id}s)"/>
      <circle cx="100" cy="100" r="86" fill="url(#${id}s)"/>
      ${bezelEl}
      <circle cx="100" cy="100" r="64" fill="url(#${id}d)"/>
      ${indices}
      <g stroke="${mark}" stroke-linecap="round">
        <line x1="100" y1="100" x2="100" y2="62" stroke-width="5" transform="rotate(305 100 100)"/>
        <line x1="100" y1="100" x2="100" y2="48" stroke-width="3.4" transform="rotate(60 100 100)"/>
        <line x1="100" y1="112" x2="100" y2="44" stroke-width="1.2" stroke="#b5503d" transform="rotate(200 100 100)"/>
      </g>
      <circle cx="100" cy="100" r="3.4" fill="${mark}"/>
      <ellipse cx="80" cy="70" rx="44" ry="26" fill="#fff" opacity=".07" transform="rotate(-30 80 70)"/>
    </svg>`;
  }

  function isLight(hex) {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
    if (!m) return false;
    const [r, g, b] = m.slice(1).map((x) => parseInt(x, 16));
    return 0.299 * r + 0.587 * g + 0.114 * b > 150;
  }

  function photoHTML(w, i = 0, eager = false) {
    const src = w.photos[i];
    if (!src) return dialSVG(w);
    return `<img src="${esc(src)}" alt="${esc(`${w.brand} ${w.model}`)}" ${eager ? "" : 'loading="lazy"'} decoding="async">`;
  }

  // ---------- Rendering ----------

  function cardHTML(w) {
    const st = STATUS[w.status];
    const meta = [w.reference, w.year, w.diameter ? `${w.diameter} мм` : ""].filter(Boolean).join(" · ");
    return `<button class="card" type="button" data-id="${esc(w.id)}" aria-label="${esc(`${w.brand} ${w.model}, ${formatPrice(w.price)}`)}">
      <div class="card__photo">
        ${photoHTML(w)}
        <span class="badge badge--${st.cls}">${st.label}</span>
      </div>
      <div class="card__body">
        <span class="card__brand">${esc(w.brand)}</span>
        <span class="card__title">${esc(w.model)}</span>
        <span class="card__meta">${esc(meta)}</span>
        <div class="card__foot">
          <span class="card__price">${w.status === "sold" ? "Продано" : formatPrice(w.price)}</span>
          <span class="card__set">${setLabel(w)}</span>
        </div>
      </div>
    </button>`;
  }

  function inRange(value, range) {
    if (!range) return true;
    const [min, max] = range.split("-").map((x) => (x === "" ? null : Number(x)));
    return (min === null || value >= min) && (max === null || value <= max);
  }

  function filtered() {
    const f = state.filters;
    const list = state.watches.filter(
      (w) =>
        w.status !== "sold" &&
        (!f.collection || w.collection === f.collection) &&
        inRange(w.price, f.price) &&
        (!f.size || inRange(w.diameter, f.size)) &&
        (!f.papers || w.papers)
    );
    const sorters = {
      new: (a, b) => a.order - b.order,
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
    };
    // Забронированные часы показываем после свободных.
    const rank = (w) => (w.status === "reserved" ? 1 : 0);
    return list.sort((a, b) => rank(a) - rank(b) || sorters[f.sort](a, b));
  }

  function renderCatalog() {
    const list = filtered();
    $("#catalog-grid").innerHTML = list.map(cardHTML).join("");
    reveal($("#catalog-grid").children);
    $("#catalog-empty").hidden = list.length > 0;
    const available = state.watches.filter((w) => w.status === "available").length;
    $("#catalog-count").textContent = available ? `${available} ${plural(available, "позиция", "позиции", "позиций")} в наличии` : "";
  }

  function renderSold() {
    const sold = state.watches.filter((w) => w.status === "sold");
    $("#sold-section").hidden = sold.length === 0;
    $("#sold-grid").innerHTML = sold.map(cardHTML).join("");
    reveal($("#sold-grid").children);
  }

  function renderCollections() {
    const collections = [...new Set(state.watches.filter((w) => w.status !== "sold").map((w) => w.collection).filter(Boolean))];
    const box = $("#filter-collection");
    if (collections.length < 2) {
      box.hidden = true;
      return;
    }
    box.innerHTML = ["", ...collections]
      .map((c) => `<button class="chip" type="button" role="radio" data-collection="${esc(c)}" aria-checked="${c === state.filters.collection}">${esc(c || "Все")}</button>`)
      .join("");
  }

  function renderHero() {
    const pick = state.watches.find((w) => w.featured && w.status === "available") || state.watches.find((w) => w.status === "available");
    const box = $("#hero-visual");
    if (!pick) return;
    box.innerHTML = `${photoHTML(pick, 0, true)}
      <div class="hero__badge">
        <div><small>${esc(pick.brand)} · ${esc(pick.reference || "")}</small><strong>${esc(pick.model)}</strong></div>
        <span class="price">${formatPrice(pick.price)}</span>
      </div>`;
    box.classList.add("is-ready");
    box.removeAttribute("aria-hidden");
    box.setAttribute("role", "button");
    box.setAttribute("tabindex", "0");
    box.setAttribute("aria-label", `${pick.brand} ${pick.model} — подробнее`);
    box.style.cursor = "pointer";
    box.onclick = () => openWatch(pick.id);
    box.onkeydown = (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openWatch(pick.id));
  }

  function renderContacts() {
    const list = $("#contacts-list");
    list.innerHTML = CONFIG.contacts
      .map(
        (c, i) => `<div class="contact">
          <span class="contact__avatar" aria-hidden="true">${esc((c.name || "?").trim().charAt(0))}</span>
          <span class="contact__name">${esc(c.name)}</span>
          ${c.role ? `<span class="muted">${esc(c.role)}</span>` : ""}
          <a class="btn btn--primary btn--sm" href="${tgLink(c)}" target="_blank" rel="noopener" data-contact="${i}">${TG_ICON} @${esc(c.username)}</a>
        </div>`
      )
      .join("");

    // Кнопки «Написать» в шапке и на первом экране ведут к первому контакту.
    document.querySelectorAll("[data-tg]").forEach((a) => {
      const c = CONFIG.contacts[Number(a.dataset.tg)];
      if (!c) return;
      a.href = tgLink(c, "Здравствуйте! Пишу с сайта Grand Watch.");
      a.target = "_blank";
      a.rel = "noopener";
    });
  }

  const TG_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.4 4.3 18.3 19c-.2 1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-1 .5l.3-4.7 8.6-7.8c.4-.3-.1-.5-.6-.2L6.5 13 2 11.6c-1-.3-1-1 .2-1.5l17.7-6.8c.8-.3 1.5.2 1.5 1z"/></svg>`;
  const CLOSE_ICON = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2 2l12 12M14 2 2 14"/></svg>`;

  // ---------- Modal ----------

  const modal = $("#watch-modal");

  function detailsHTML(w) {
    const st = STATUS[w.status];
    const specs = [
      ["Референс", w.reference],
      ["Год", w.year],
      ["Диаметр", w.diameter ? `${w.diameter} мм` : ""],
      ["Корпус", w.material],
      ["Механизм", w.movement],
      ["Циферблат", w.dial],
      ["Состояние", w.condition],
      ["Комплект", [w.box && "коробка", w.papers && "документы"].filter(Boolean).join(", ") || "без комплекта"],
      ["Артикул", w.id],
    ].filter(([, v]) => v);

    const thumbs = w.photos.length > 1
      ? `<div class="gallery__thumbs">${w.photos
          .map((src, i) => `<button type="button" data-photo="${i}" aria-label="Фото ${i + 1}" aria-current="${i === 0}"><img src="${esc(src)}" alt="" loading="lazy"></button>`)
          .join("")}</div>`
      : "";

    let reserve;
    if (w.status === "available") {
      reserve = `<div class="reserve">
        <div class="reserve__buttons">${CONFIG.contacts
          .map((c) => `<a class="btn btn--primary" href="${tgLink(c, reserveText(w))}" target="_blank" rel="noopener">${TG_ICON} Бронь у ${esc(c.nameGenitive || c.name)}</a>`)
          .join("")}</div>
        <p class="reserve__hint">Откроется Telegram с готовым сообщением. Бронь на ${CONFIG.reserveHours}&nbsp;часов после предоплаты ${depositText()}, она засчитывается в стоимость.</p>
      </div>`;
    } else if (w.status === "reserved") {
      const text = `Здравствуйте! Интересуют часы ${w.brand} ${w.model} (${w.id}). Если бронь снимут, напишите мне, пожалуйста.\n${watchUrl(w)}`;
      reserve = `<div class="reserve">
        <a class="btn btn--ghost" href="${CONFIG.contacts[0] ? tgLink(CONFIG.contacts[0], text) : "#contacts"}" target="_blank" rel="noopener">${TG_ICON} Сообщить, если освободятся</a>
        <p class="reserve__hint">Эти часы сейчас забронированы. Если бронь снимут, мы напишем вам.</p>
      </div>`;
    } else {
      const text = `Здравствуйте! Ищу часы, похожие на ${w.brand} ${w.model}${w.reference ? " " + w.reference : ""}.`;
      reserve = `<div class="reserve">
        <a class="btn btn--ghost" href="${CONFIG.contacts[0] ? tgLink(CONFIG.contacts[0], text) : "#contacts"}" target="_blank" rel="noopener">${TG_ICON} Найти похожие</a>
        <p class="reserve__hint">Эти часы уже проданы. Подберём похожие под заказ.</p>
      </div>`;
    }

    return `<button class="modal__close" type="button" data-close aria-label="Закрыть">${CLOSE_ICON}</button>
      <div class="gallery">
        <div class="gallery__main" id="gallery-main">${photoHTML(w, 0, true)}</div>
        ${thumbs}
      </div>
      <div class="details">
        <div>
          <p class="eyebrow">${esc(w.brand)}${w.collection ? " · " + esc(w.collection) : ""}</p>
          <h2 class="details__title" id="modal-title">${esc(w.model)}</h2>
          ${w.reference ? `<p class="details__ref">Референс ${esc(w.reference)}</p>` : ""}
        </div>
        <div>
          <div class="details__price">${w.status === "sold" ? "Продано" : formatPrice(w.price)}</div>
          <span class="details__status badge--${st.cls}">${st.label}</span>
        </div>
        ${reserve}
        ${w.description ? `<p class="details__desc">${esc(w.description)}</p>` : ""}
        <dl class="specs">${specs.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
        <button class="details__share" type="button" data-share>Скопировать ссылку на часы</button>
      </div>`;
  }

  let openedFromPage = false;

  function openWatch(id, push = true) {
    const w = state.watches.find((x) => x.id === id);
    if (!w) return;
    $("#modal-content").innerHTML = detailsHTML(w);
    $("#modal-content").dataset.id = w.id;
    if (!modal.open) {
      document.body.style.overflow = "hidden";
      modal.showModal();
    }
    modal.scrollTop = 0;
    if (push && location.hash !== `#w/${encodeURIComponent(id)}`) {
      history.pushState({ watch: id }, "", `#w/${encodeURIComponent(id)}`);
      openedFromPage = true;
    }
  }

  function closeWatch() {
    if (!modal.open) return;
    modal.close();
  }

  modal.addEventListener("close", () => {
    document.body.style.overflow = "";
    if (location.hash.startsWith("#w/")) {
      if (openedFromPage) history.back();
      else history.replaceState(null, "", location.pathname + location.search);
    }
    openedFromPage = false;
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) return closeWatch(); // клик по фону
    if (e.target.closest("[data-close]")) return closeWatch();

    const thumb = e.target.closest("[data-photo]");
    if (thumb) {
      const w = state.watches.find((x) => x.id === $("#modal-content").dataset.id);
      const i = Number(thumb.dataset.photo);
      $("#gallery-main").innerHTML = photoHTML(w, i, true);
      modal.querySelectorAll("[data-photo]").forEach((b) => b.setAttribute("aria-current", String(b === thumb)));
      return;
    }

    const share = e.target.closest("[data-share]");
    if (share) {
      const w = state.watches.find((x) => x.id === $("#modal-content").dataset.id);
      copy(watchUrl(w)).then(
        () => (share.textContent = "Ссылка скопирована"),
        () => (share.textContent = watchUrl(w))
      );
    }
  });

  async function copy(text) {
    if (navigator.clipboard) return navigator.clipboard.writeText(text);
    throw new Error("no clipboard");
  }

  function syncFromHash() {
    const m = /^#w\/(.+)$/.exec(location.hash);
    if (m) openWatch(decodeURIComponent(m[1]), false);
    else if (modal.open) {
      openedFromPage = false;
      modal.close();
    }
  }

  window.addEventListener("popstate", () => {
    openedFromPage = false;
    syncFromHash();
  });

  // ---------- Events ----------

  function bindFilters() {
    $("#filter-collection").addEventListener("click", (e) => {
      const chip = e.target.closest("[data-collection]");
      if (!chip) return;
      state.filters.collection = chip.dataset.collection;
      renderCollections();
      renderCatalog();
    });
    const bind = (sel, key, prop = "value") =>
      $(sel).addEventListener("change", (e) => {
        state.filters[key] = e.target[prop];
        renderCatalog();
      });
    bind("#filter-price", "price");
    bind("#filter-size", "size");
    bind("#filter-papers", "papers", "checked");
    bind("#filter-sort", "sort");

    $("#filters-reset").addEventListener("click", () => {
      state.filters = { collection: "", price: "", size: "", papers: false, sort: state.filters.sort };
      $("#filter-price").value = "";
      $("#filter-size").value = "";
      $("#filter-papers").checked = false;
      renderCollections();
      renderCatalog();
    });

    document.addEventListener("click", (e) => {
      const card = e.target.closest(".card[data-id]");
      if (card) openWatch(card.dataset.id);
    });
  }

  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  function applyTexts() {
    document.querySelectorAll("[data-deposit]").forEach((el) => (el.textContent = depositText()));
    document.querySelectorAll("[data-reserve-hours]").forEach((el) => (el.textContent = CONFIG.reserveHours));
    document.querySelectorAll("[data-city-suffix]").forEach((el) => (el.textContent = CONFIG.city ? ` в г. ${CONFIG.city}` : ""));
    $("#year").textContent = new Date().getFullYear();
  }

  // ---------- Motion ----------

  // Блоки мягко проявляются при прокрутке. Без поддержки или при «уменьшить движение» всё видно сразу.
  const motionOK = "IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const observer = motionOK
    ? new IntersectionObserver(
        (entries) =>
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            e.target.classList.add("is-in");
            observer.unobserve(e.target);
          }),
        { rootMargin: "0px 0px -8% 0px" }
      )
    : null;

  function reveal(elements) {
    if (!observer) return;
    [...elements].forEach((el, i) => {
      el.classList.add("reveal");
      el.style.transitionDelay = `${(i % 4) * 90}ms`;
      observer.observe(el);
    });
  }

  if (motionOK) document.documentElement.classList.add("motion");

  // ---------- Boot ----------

  async function init() {
    applyTexts();
    document.querySelectorAll(".section__head").forEach((el) => reveal([el]));
    reveal(document.querySelectorAll(".steps li"));
    reveal(document.querySelectorAll(".checklist li"));
    reveal(document.querySelectorAll(".faq details"));
    reveal(document.querySelectorAll(".trust__text"));
    renderContacts();
    reveal($("#contacts-list").children);
    bindFilters();
    $("#catalog-grid").innerHTML = '<div class="skeleton"></div>'.repeat(3);
    try {
      state.watches = await loadWatches();
    } catch (err) {
      console.error("Не удалось загрузить каталог", err);
      $("#catalog-grid").innerHTML = "";
      $("#catalog-empty").hidden = false;
      $("#catalog-empty").firstElementChild.textContent = "Не удалось загрузить каталог. Обновите страницу или напишите нам в Telegram.";
      return;
    }
    renderHero();
    renderCollections();
    renderCatalog();
    renderSold();
    syncFromHash();
  }

  init();
})();
