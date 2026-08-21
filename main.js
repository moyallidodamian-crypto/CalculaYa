/* CalculaYa — main.js
   Entry point. DOM wiring only — all math lives in lib/calculators.js.
   Every init* is feature-gated (checks its own element exists) and wrapped
   in safe(), so a missing element on a given page is a silent no-op and a
   bug in one calculator never breaks the rest of the site. */
(function () {
  "use strict";

  var BRAND = window.__BRAND__ || {};
  var Calc = window.__CALC__ || {};

  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var escHTML = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  function safe(fn, name) {
    try { fn(); } catch (e) { console.warn("[" + name + "] failed:", e); }
  }

  /* ---------------------------------------------------------
     Shared: navigation
     --------------------------------------------------------- */
  function initNav() {
    var toggle = $(".nav-toggle");
    var panel = $(".mobile-nav");
    if (!toggle || !panel) return;
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      panel.classList.toggle("is-open", !open);
      document.body.style.overflow = !open ? "hidden" : "";
    });
    $$("a", panel).forEach(function (a) {
      a.addEventListener("click", function () {
        toggle.setAttribute("aria-expanded", "false");
        panel.classList.remove("is-open");
        document.body.style.overflow = "";
      });
    });
  }

  /* ---------------------------------------------------------
     Shared: reveal-on-scroll (subtle, below the fold only)
     --------------------------------------------------------- */
  function initReveals() {
    var targets = $$("[data-reveal]");
    if (!targets.length) return;
    if (reduced || !window.IntersectionObserver) {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -2% 0px" });
    targets.forEach(function (el) { el.classList.add("reveal"); io.observe(el); });
    setTimeout(function () {
      targets.forEach(function (el) {
        if (!el.classList.contains("is-visible") && el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("is-visible");
        }
      });
    }, 6000);
  }

  /* ---------------------------------------------------------
     Shared: homepage search
     --------------------------------------------------------- */
  function normalize(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function searchTools(query) {
    var q = normalize(query).trim();
    if (!q) return [];
    var tools = BRAND.tools || [];
    return tools.filter(function (t) {
      if (normalize(t.name).indexOf(q) !== -1) return true;
      if (normalize(t.desc).indexOf(q) !== -1) return true;
      return (t.keywords || []).some(function (k) { return normalize(k).indexOf(q) !== -1; });
    });
  }
  function initSearch() {
    var input = $("[data-search-input]");
    var resultsBox = $("[data-search-results]");
    if (!input || !resultsBox) return;

    function render(list, query) {
      if (!query.trim()) { resultsBox.classList.remove("is-open"); resultsBox.innerHTML = ""; return; }
      if (!list.length) {
        resultsBox.innerHTML = '<div class="search-empty">No hay resultados para "' + escHTML(query) + '". Prueba con «IVA», «edad», «sueldo»…</div>';
        resultsBox.classList.add("is-open");
        return;
      }
      resultsBox.innerHTML = list.map(function (t) {
        return '<a href="' + t.url + '"><span class="result-icon">' + t.icon + '</span>' +
          '<span><span class="result-name">' + escHTML(t.name) + '</span><br>' +
          '<span class="result-desc">' + escHTML(t.desc) + '</span></span></a>';
      }).join("");
      resultsBox.classList.add("is-open");
    }

    input.addEventListener("input", function () { render(searchTools(input.value), input.value); });
    input.addEventListener("focus", function () { if (input.value.trim()) render(searchTools(input.value), input.value); });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".searchbox")) resultsBox.classList.remove("is-open");
    });
    var form = input.closest("form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var list = searchTools(input.value);
        if (list.length) window.location.href = list[0].url;
      });
    }
  }

  /* ---------------------------------------------------------
     Shared: category filter (/calculadoras.html)
     --------------------------------------------------------- */
  function initCategoryFilter() {
    var pills = $$("[data-filter-cat]");
    var cards = $$("[data-cat]", $("[data-tool-grid]") || document);
    if (!pills.length || !cards.length) return;
    pills.forEach(function (pill) {
      pill.addEventListener("click", function () {
        pills.forEach(function (p) { p.classList.remove("is-active"); });
        pill.classList.add("is-active");
        var cat = pill.getAttribute("data-filter-cat");
        cards.forEach(function (card) {
          var show = cat === "todas" || card.getAttribute("data-cat") === cat;
          card.style.display = show ? "" : "none";
        });
      });
    });
  }

  /* ---------------------------------------------------------
     Shared: result actions (copy / reset) via delegation
     --------------------------------------------------------- */
  function gatherResultText(card) {
    var panel = $(".result-panel", card);
    if (!panel) return "";
    var lines = [];
    var label = $(".result-label", panel);
    var value = $(".result-value", panel);
    if (label && value) lines.push(label.textContent.trim() + ": " + value.textContent.trim());
    $$(".result-stat", panel).forEach(function (stat) {
      var l = $(".stat-label", stat), v = $(".stat-value", stat);
      if (l && v) lines.push(l.textContent.trim() + ": " + v.textContent.trim());
    });
    return lines.join("\n");
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        resolve();
      } catch (e) { reject(e); }
    });
  }
  function initResultActions() {
    document.addEventListener("click", function (e) {
      var copyBtn = e.target.closest("[data-action='copy']");
      if (copyBtn) {
        var card = copyBtn.closest(".calc-card");
        if (!card) return;
        var text = gatherResultText(card);
        if (!text) return;
        copyText(text).then(function () {
          var fb = $(".copy-feedback", card);
          if (fb) { fb.classList.add("is-visible"); setTimeout(function () { fb.classList.remove("is-visible"); }, 1800); }
        });
        return;
      }
      var resetBtn = e.target.closest("[data-action='reset']");
      if (resetBtn) {
        var cardEl = resetBtn.closest(".calc-card");
        if (!cardEl) return;
        $$("input, select", cardEl).forEach(function (el) {
          if (el.type === "radio" || el.type === "checkbox") el.checked = el.defaultChecked;
          else el.value = el.defaultValue || "";
          el.classList.remove("is-invalid");
        });
        $$(".field-error", cardEl).forEach(function (el) { el.classList.remove("is-visible"); });
        $$(".result-panel", cardEl).forEach(function (el) { el.classList.remove("is-visible"); });
        $$(".error-banner", cardEl).forEach(function (el) { el.classList.remove("is-visible"); });
        var firstTab = $(".calc-tab", cardEl);
        if (firstTab) firstTab.click();
        var firstInput = $("input, select", cardEl);
        if (firstInput) firstInput.focus();
      }
    });
  }

  /* ---------------------------------------------------------
     Shared: generic tabs
     --------------------------------------------------------- */
  function initTabs(card, onChange) {
    var tabs = $$(".calc-tab", card);
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) { t.setAttribute("aria-selected", "false"); });
        tab.setAttribute("aria-selected", "true");
        card.setAttribute("data-mode", tab.getAttribute("data-mode"));
        $$(".result-panel", card).forEach(function (el) { el.classList.remove("is-visible"); });
        $$(".error-banner", card).forEach(function (el) { el.classList.remove("is-visible"); });
        if (onChange) onChange(tab.getAttribute("data-mode"));
      });
    });
  }

  function showError(banner, msg) {
    if (!banner) return;
    banner.textContent = msg;
    banner.classList.add("is-visible");
  }
  function hideError(banner) { if (banner) banner.classList.remove("is-visible"); }
  function markInvalid(input, errorEl, invalid) {
    if (input) input.classList.toggle("is-invalid", !!invalid);
    if (errorEl) errorEl.classList.toggle("is-visible", !!invalid);
  }
  function readFloat(input) {
    var v = parseFloat(String(input.value).replace(",", "."));
    return v;
  }

  /* ===========================================================
     1. Calculadora de porcentajes
     =========================================================== */
  function initPercentCalc() {
    var card = $("#calc-porcentajes");
    if (!card) return;
    var form = $("#form-porcentajes", card);
    var inputA = $("#pct-a", card), inputB = $("#pct-b", card);
    var labelA = $("#pct-label-a", card), labelB = $("#pct-label-b", card);
    var errorA = $("#pct-error-a", card), errorB = $("#pct-error-b", card);
    var errorBanner = $("#pct-error-banner", card);
    var resultPanel = $("#pct-result", card);
    var resultValue = $("#pct-result-value", card);
    var resultExplain = $("#pct-result-explain", card);

    var modes = {
      of: { a: "Porcentaje (%)", b: "Cantidad total", ph_a: "20", ph_b: "150" },
      what: { a: "Cantidad (parte)", b: "Total", ph_a: "150", ph_b: "500" },
      increase: { a: "Cantidad inicial", b: "% a aumentar", ph_a: "150", ph_b: "20" },
      decrease: { a: "Cantidad inicial", b: "% a reducir", ph_a: "150", ph_b: "20" }
    };

    function setMode(mode) {
      var m = modes[mode] || modes.of;
      labelA.textContent = m.a; labelB.textContent = m.b;
      inputA.placeholder = m.ph_a; inputB.placeholder = m.ph_b;
      inputA.value = ""; inputB.value = "";
      markInvalid(inputA, errorA, false); markInvalid(inputB, errorB, false);
    }
    initTabs(card, setMode);
    setMode("of");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      hideError(errorBanner);
      var mode = card.getAttribute("data-mode") || "of";
      var a = readFloat(inputA), b = readFloat(inputB);
      var okA = isFinite(a), okB = isFinite(b);
      markInvalid(inputA, errorA, !okA); markInvalid(inputB, errorB, !okB);
      if (!okA || !okB) { showError(errorBanner, "Revisa los campos: introduce solo números."); return; }
      if (mode === "what" && b === 0) { markInvalid(inputB, errorB, true); showError(errorBanner, "El total no puede ser 0."); return; }

      var out;
      if (mode === "of") out = Calc.percentOf(a, b);
      else if (mode === "what") out = Calc.whatPercent(a, b);
      else if (mode === "increase") out = Calc.increaseBy(a, b);
      else out = Calc.decreaseBy(a, b);

      var valueText, explainText;
      if (mode === "of") {
        valueText = Calc.formatNumber(out.result, 2);
        explainText = "Fórmula: " + a + "% de " + Calc.formatNumber(b, 2) + " = (" + a + " ÷ 100) × " + Calc.formatNumber(b, 2) + " = " + Calc.formatNumber(out.result, 2) + ".";
      } else if (mode === "what") {
        valueText = Calc.formatNumber(out.result, 2) + " %";
        explainText = "Fórmula: (" + Calc.formatNumber(a, 2) + " ÷ " + Calc.formatNumber(b, 2) + ") × 100 = " + Calc.formatNumber(out.result, 2) + "%.";
      } else {
        valueText = Calc.formatNumber(out.result, 2);
        var verbo = mode === "increase" ? "aumentado" : "reducido";
        explainText = Calc.formatNumber(a, 2) + " " + verbo + " un " + b + "% = " + Calc.formatNumber(out.result, 2) + " (diferencia de " + Calc.formatNumber(out.delta, 2) + ").";
      }
      resultValue.textContent = valueText;
      resultExplain.textContent = explainText;
      resultPanel.classList.add("is-visible");
    });
  }

  /* ===========================================================
     2. Calculadora de IVA
     =========================================================== */
  function initVatCalc() {
    var card = $("#calc-iva");
    if (!card) return;
    var form = $("#form-iva", card);
    var amountInput = $("#iva-amount", card);
    var amountError = $("#iva-amount-error", card);
    var errorBanner = $("#iva-error-banner", card);
    var customInput = $("#iva-custom", card);
    var customWrap = $("#iva-custom-wrap", card);
    var resultPanel = $("#iva-result", card);
    var resultValue = $("#iva-result-value", card);
    var resultExplain = $("#iva-result-explain", card);
    var statBase = $("#iva-stat-base", card), statVat = $("#iva-stat-vat", card), statTotal = $("#iva-stat-total", card);
    var amountLabel = $("#iva-amount-label", card);

    function setMode(mode) {
      amountLabel.textContent = mode === "add" ? "Precio sin IVA" : "Precio con IVA";
    }
    initTabs(card, setMode);
    setMode("add");

    $$("input[name='iva-rate']", card).forEach(function (radio) {
      radio.addEventListener("change", function () {
        customWrap.hidden = radio.value !== "custom";
        if (radio.value === "custom") customInput.focus();
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      hideError(errorBanner);
      var mode = card.getAttribute("data-mode") || "add";
      var amount = readFloat(amountInput);
      var okAmount = isFinite(amount) && amount >= 0;
      markInvalid(amountInput, amountError, !okAmount);
      if (!okAmount) { showError(errorBanner, "Introduce un precio válido (número igual o mayor que 0)."); return; }

      var rateChecked = $("input[name='iva-rate']:checked", card);
      var rate = rateChecked && rateChecked.value === "custom" ? readFloat(customInput) : parseFloat(rateChecked ? rateChecked.value : "21");
      if (!isFinite(rate) || rate < 0 || rate > 100) { showError(errorBanner, "El porcentaje de IVA personalizado debe estar entre 0 y 100."); return; }

      var out = mode === "add" ? Calc.addVAT(amount, rate) : Calc.removeVAT(amount, rate);
      statBase.textContent = Calc.formatCurrency(out.base, "EUR");
      statVat.textContent = Calc.formatCurrency(out.vat, "EUR") + " (" + rate + "%)";
      statTotal.textContent = Calc.formatCurrency(out.total, "EUR");
      resultValue.textContent = Calc.formatCurrency(mode === "add" ? out.total : out.base, "EUR");
      resultExplain.textContent = mode === "add"
        ? "Precio final = " + Calc.formatCurrency(amount, "EUR") + " × (1 + " + rate + "/100) = " + Calc.formatCurrency(out.total, "EUR") + "."
        : "Precio sin IVA = " + Calc.formatCurrency(amount, "EUR") + " ÷ (1 + " + rate + "/100) = " + Calc.formatCurrency(out.base, "EUR") + ".";
      resultPanel.classList.add("is-visible");
    });
  }

  /* ===========================================================
     3. Calculadora de edad
     =========================================================== */
  function initAgeCalc() {
    var card = $("#calc-edad");
    if (!card) return;
    var form = $("#form-edad", card);
    var dateInput = $("#edad-birthdate", card);
    var dateError = $("#edad-error", card);
    var errorBanner = $("#edad-error-banner", card);
    var resultPanel = $("#edad-result", card);
    var resultValue = $("#edad-result-value", card);
    var statMonths = $("#edad-stat-months", card), statDays = $("#edad-stat-days", card);
    var statNext = $("#edad-stat-next", card), statLeft = $("#edad-stat-left", card);

    var today = new Date();
    dateInput.max = today.toISOString().slice(0, 10);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      hideError(errorBanner);
      if (!dateInput.value) { markInvalid(dateInput, dateError, true); showError(errorBanner, "Selecciona tu fecha de nacimiento."); return; }
      var parts = dateInput.value.split("-").map(Number);
      var birth = new Date(parts[0], parts[1] - 1, parts[2]);
      var now = new Date();
      if (birth.getTime() > now.getTime()) { markInvalid(dateInput, dateError, true); showError(errorBanner, "La fecha de nacimiento no puede ser futura."); return; }
      markInvalid(dateInput, dateError, false);

      var out = Calc.calculateAge(birth, now);
      resultValue.textContent = out.years + " años";
      statMonths.textContent = out.months + " meses";
      statDays.textContent = out.days + " días";
      statNext.textContent = out.nextBirthday.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
      statLeft.textContent = out.daysToNextBirthday + " días";
      resultPanel.classList.add("is-visible");
    });
  }

  /* ===========================================================
     4. Calculadora de interés compuesto
     =========================================================== */
  function drawGrowthChart(canvas, history) {
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    var w = rect.width, h = rect.height;
    var pad = { l: 56, r: 12, t: 14, b: 26 };
    var pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
    var maxVal = Math.max.apply(null, history.map(function (p) { return p.balance; })) * 1.05 || 1;
    var maxMonth = history[history.length - 1].month || 1;
    function x(m) { return pad.l + (m / maxMonth) * pw; }
    function y(v) { return pad.t + ph - (v / maxVal) * ph; }

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "#e6e3da"; ctx.lineWidth = 1; ctx.font = "11px Inter, sans-serif";
    ctx.fillStyle = "#86869c"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (var i = 0; i <= 4; i++) {
      var gy = pad.t + (ph / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.l, gy); ctx.lineTo(w - pad.r, gy); ctx.stroke();
      var val = maxVal - (maxVal / 4) * i;
      ctx.fillText(Calc.formatNumber(val, 0), pad.l - 8, gy);
    }

    ctx.setLineDash([4, 3]); ctx.strokeStyle = "#a3a3ba"; ctx.lineWidth = 2;
    ctx.beginPath();
    history.forEach(function (p, i) { var px = x(p.month), py = y(p.contributed); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
    ctx.stroke(); ctx.setLineDash([]);

    var last = history[history.length - 1];
    ctx.beginPath();
    history.forEach(function (p, i) { var px = x(p.month), py = y(p.balance); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
    var pathBalance = new Path2D();
    history.forEach(function (p, i) { var px = x(p.month), py = y(p.balance); if (i === 0) pathBalance.moveTo(px, py); else pathBalance.lineTo(px, py); });
    ctx.strokeStyle = "#3f3ff0"; ctx.lineWidth = 2.5; ctx.stroke(pathBalance);

    var fillPath = new Path2D(pathBalance);
    fillPath.lineTo(x(last.month), y(0));
    fillPath.lineTo(x(history[0].month), y(0));
    fillPath.closePath();
    var grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ph);
    grad.addColorStop(0, "rgba(63,63,240,.16)"); grad.addColorStop(1, "rgba(63,63,240,0)");
    ctx.fillStyle = grad; ctx.fill(fillPath);
  }

  function initCompoundInterestCalc() {
    var card = $("#calc-interes");
    if (!card) return;
    var form = $("#form-interes", card);
    var fPrincipal = $("#interes-principal", card), fContribution = $("#interes-contribution", card);
    var fFrequency = $("#interes-frequency", card), fRate = $("#interes-rate", card), fYears = $("#interes-years", card);
    var errorBanner = $("#interes-error-banner", card);
    var resultPanel = $("#interes-result", card);
    var resultValue = $("#interes-result-value", card);
    var statContributed = $("#interes-stat-contributed", card), statInterest = $("#interes-stat-interest", card);
    var canvas = $("#interes-chart", card);
    var lastHistory = null;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      hideError(errorBanner);
      var principal = readFloat(fPrincipal) || 0;
      var contribution = readFloat(fContribution) || 0;
      var rate = readFloat(fRate);
      var years = readFloat(fYears);
      var badFields = [];
      if (!isFinite(principal) || principal < 0) badFields.push(fPrincipal);
      if (!isFinite(contribution) || contribution < 0) badFields.push(fContribution);
      if (!isFinite(rate) || rate < 0 || rate > 100) badFields.push(fRate);
      if (!isFinite(years) || years <= 0 || years > 80) badFields.push(fYears);
      $$(".input", card).forEach(function (i) { i.classList.remove("is-invalid"); });
      if (badFields.length) {
        badFields.forEach(function (i) { i.classList.add("is-invalid"); });
        showError(errorBanner, "Revisa los campos marcados: usa números válidos (la tasa entre 0 y 100, los años entre 1 y 80).");
        return;
      }

      var out = Calc.compoundInterest({ principal: principal, contribution: contribution, frequency: fFrequency.value, annualRate: rate, years: years });
      resultValue.textContent = Calc.formatCurrency(out.finalBalance, "EUR");
      statContributed.textContent = Calc.formatCurrency(out.totalContributed, "EUR");
      statInterest.textContent = Calc.formatCurrency(out.totalInterest, "EUR");
      resultPanel.classList.add("is-visible");
      lastHistory = out.history;
      safe(function () { drawGrowthChart(canvas, lastHistory); }, "drawGrowthChart");
    });

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { if (lastHistory) safe(function () { drawGrowthChart(canvas, lastHistory); }, "drawGrowthChart"); }, 200);
    });
  }

  /* ===========================================================
     5. Calculadora de sueldo neto
     =========================================================== */
  function initSalaryCalc() {
    var card = $("#calc-sueldo");
    if (!card) return;
    var form = $("#form-sueldo", card);
    var fBruto = $("#sueldo-bruto", card), fPagas = $("#sueldo-pagas", card);
    var fSituacion = $("#sueldo-situacion", card), fCcaa = $("#sueldo-ccaa", card), fContrato = $("#sueldo-contrato", card);
    var errorBanner = $("#sueldo-error-banner", card);
    var resultPanel = $("#sueldo-result", card);
    var resultValue = $("#sueldo-result-value", card);
    var statBrutoMes = $("#sueldo-stat-bruto-mes", card), statSS = $("#sueldo-stat-ss", card);
    var statIrpf = $("#sueldo-stat-irpf", card), statNetoAnual = $("#sueldo-stat-neto-anual", card), statTipo = $("#sueldo-stat-tipo", card);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      hideError(errorBanner);
      var bruto = readFloat(fBruto);
      if (!isFinite(bruto) || bruto <= 0) {
        fBruto.classList.add("is-invalid");
        showError(errorBanner, "Introduce un salario bruto anual válido.");
        return;
      }
      fBruto.classList.remove("is-invalid");

      var out = Calc.netSalary({
        brutoAnual: bruto,
        pagas: parseInt(fPagas.value, 10),
        situacion: fSituacion.value,
        ccaa: fCcaa.value,
        contrato: fContrato.value
      }, BRAND.irpf);

      resultValue.textContent = Calc.formatCurrency(out.netoMensual, "EUR") + " / mes";
      statBrutoMes.textContent = Calc.formatCurrency(out.brutoMensual, "EUR");
      statSS.textContent = Calc.formatCurrency(out.ssMensual, "EUR") + "/mes";
      statIrpf.textContent = Calc.formatNumber(out.tipoEfectivo, 1) + "%";
      statNetoAnual.textContent = Calc.formatCurrency(out.netoAnual, "EUR");
      statTipo.textContent = Calc.formatCurrency(out.irpf, "EUR") + "/año";
      resultPanel.classList.add("is-visible");
    });
  }

  /* ===========================================================
     6. Calculadora de IMC
     =========================================================== */
  function initBmiCalc() {
    var card = $("#calc-imc");
    if (!card) return;
    var form = $("#form-imc", card);
    var fWeight = $("#imc-weight", card), fHeight = $("#imc-height", card);
    var errorBanner = $("#imc-error-banner", card);
    var resultPanel = $("#imc-result", card);
    var resultValue = $("#imc-result-value", card);
    var statCategory = $("#imc-stat-category", card), statInterpretation = $("#imc-interpretation", card);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      hideError(errorBanner);
      var weight = readFloat(fWeight), height = readFloat(fHeight);
      var bad = [];
      if (!isFinite(weight) || weight <= 0 || weight > 500) bad.push(fWeight);
      if (!isFinite(height) || height <= 0 || height > 260) bad.push(fHeight);
      $$(".input", card).forEach(function (i) { i.classList.remove("is-invalid"); });
      if (bad.length) {
        bad.forEach(function (i) { i.classList.add("is-invalid"); });
        showError(errorBanner, "Introduce un peso (kg) y una altura (cm) válidos.");
        return;
      }
      var out = Calc.bmi(weight, height);
      resultValue.textContent = Calc.formatNumber(out.bmi, 1);
      statCategory.textContent = out.category;
      statInterpretation.textContent = out.interpretation;
      resultPanel.classList.add("is-visible");
    });
  }

  /* ===========================================================
     7. Calculadora de días entre fechas
     =========================================================== */
  function initDaysBetweenCalc() {
    var card = $("#calc-dias");
    if (!card) return;
    var formBetween = $("#form-dias-between", card);
    var formUntil = $("#form-dias-until", card);
    var fStart = $("#dias-start", card), fEnd = $("#dias-end", card), fTarget = $("#dias-target", card);
    var errorBanner = $("#dias-error-banner", card);
    var resultPanel = $("#dias-result", card);
    var resultValue = $("#dias-result-value", card);
    var resultExplain = $("#dias-result-explain", card);
    var statWeeks = $("#dias-stat-weeks", card), statMonths = $("#dias-stat-months", card), statYears = $("#dias-stat-years", card);
    var statGrid = $("#dias-stat-grid", card);

    function setMode(mode) {
      formBetween.hidden = mode !== "between";
      formUntil.hidden = mode !== "until";
    }
    initTabs(card, setMode);
    setMode("between");

    formBetween.addEventListener("submit", function (e) {
      e.preventDefault();
      hideError(errorBanner);
      if (!fStart.value || !fEnd.value) { showError(errorBanner, "Selecciona ambas fechas."); return; }
      var start = new Date(fStart.value + "T00:00:00");
      var end = new Date(fEnd.value + "T00:00:00");
      var out = Calc.daysBetween(start, end);
      statGrid.hidden = false;
      resultValue.textContent = Calc.formatNumber(Math.abs(out.totalDays), 0) + " días";
      resultExplain.textContent = out.totalDays < 0 ? "La fecha final es anterior a la inicial." : "Entre el " + start.toLocaleDateString("es-ES") + " y el " + end.toLocaleDateString("es-ES") + ".";
      statWeeks.textContent = Calc.formatNumber(Math.abs(out.weeks), 1) + " semanas";
      statMonths.textContent = "≈ " + Calc.formatNumber(Math.abs(out.months), 1) + " meses";
      statYears.textContent = "≈ " + Calc.formatNumber(Math.abs(out.years), 2) + " años";
      resultPanel.classList.add("is-visible");
    });

    formUntil.addEventListener("submit", function (e) {
      e.preventDefault();
      hideError(errorBanner);
      if (!fTarget.value) { showError(errorBanner, "Selecciona una fecha."); return; }
      var target = new Date(fTarget.value + "T00:00:00");
      var out = Calc.daysUntil(target);
      statGrid.hidden = true;
      resultValue.textContent = (out.isPast ? "Hace " : "Quedan ") + Calc.formatNumber(Math.abs(out.totalDays), 0) + " días";
      resultExplain.textContent = out.isPast ? "Esa fecha ya pasó." : "Hasta el " + target.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" }) + ".";
      resultPanel.classList.add("is-visible");
    });
  }

  /* ===========================================================
     8. Calculadora de ritmo de carrera
     =========================================================== */
  function initPaceCalc() {
    var card = $("#calc-ritmo");
    if (!card) return;
    var forms = { pace: $("#form-ritmo-pace", card), time: $("#form-ritmo-time", card), distance: $("#form-ritmo-distance", card) };
    var errorBanner = $("#ritmo-error-banner", card);
    var resultPanel = $("#ritmo-result", card);
    var resultValue = $("#ritmo-result-value", card);
    var resultExplain = $("#ritmo-result-explain", card);
    var statSecondary = $("#ritmo-stat-secondary", card);

    function setMode(mode) {
      Object.keys(forms).forEach(function (k) { if (forms[k]) forms[k].hidden = k !== mode; });
    }
    initTabs(card, setMode);
    setMode("pace");

    forms.pace.addEventListener("submit", function (e) {
      e.preventDefault();
      hideError(errorBanner);
      var dist = readFloat($("#ritmo-p-distance", card));
      var timeSec = Calc.parseHMS($("#ritmo-p-time", card).value);
      if (!isFinite(dist) || dist <= 0 || !isFinite(timeSec) || timeSec <= 0) { showError(errorBanner, "Introduce una distancia válida y un tiempo con formato hh:mm:ss o mm:ss."); return; }
      var out = Calc.paceFromDistanceTime(dist, timeSec);
      resultValue.textContent = Calc.formatPace(out.secPerKm);
      resultExplain.textContent = "Ritmo = tiempo ÷ distancia = " + Calc.formatDuration(timeSec) + " ÷ " + dist + " km.";
      statSecondary.textContent = Calc.formatNumber(out.speedKmh, 2) + " km/h de velocidad media";
      resultPanel.classList.add("is-visible");
    });

    forms.time.addEventListener("submit", function (e) {
      e.preventDefault();
      hideError(errorBanner);
      var dist = readFloat($("#ritmo-t-distance", card));
      var paceSec = Calc.parseHMS($("#ritmo-t-pace", card).value);
      if (!isFinite(dist) || dist <= 0 || !isFinite(paceSec) || paceSec <= 0) { showError(errorBanner, "Introduce una distancia válida y un ritmo con formato mm:ss."); return; }
      var totalSec = Calc.timeFromDistancePace(dist, paceSec);
      resultValue.textContent = Calc.formatDuration(totalSec);
      resultExplain.textContent = "Tiempo = distancia × ritmo = " + dist + " km × " + Calc.formatPace(paceSec) + ".";
      statSecondary.textContent = Calc.formatNumber(dist / (totalSec / 3600), 2) + " km/h de velocidad media";
      resultPanel.classList.add("is-visible");
    });

    forms.distance.addEventListener("submit", function (e) {
      e.preventDefault();
      hideError(errorBanner);
      var timeSec = Calc.parseHMS($("#ritmo-d-time", card).value);
      var paceSec = Calc.parseHMS($("#ritmo-d-pace", card).value);
      if (!isFinite(timeSec) || timeSec <= 0 || !isFinite(paceSec) || paceSec <= 0) { showError(errorBanner, "Introduce un tiempo (hh:mm:ss) y un ritmo (mm:ss) válidos."); return; }
      var dist = Calc.distanceFromTimePace(timeSec, paceSec);
      resultValue.textContent = Calc.formatNumber(dist, 2) + " km";
      resultExplain.textContent = "Distancia = tiempo ÷ ritmo = " + Calc.formatDuration(timeSec) + " ÷ " + Calc.formatPace(paceSec) + ".";
      statSecondary.textContent = Calc.formatNumber(dist / (timeSec / 3600), 2) + " km/h de velocidad media";
      resultPanel.classList.add("is-visible");
    });
  }

  /* ===========================================================
     9. Conversor de unidades
     =========================================================== */
  function initUnitConverter() {
    var card = $("#calc-conversor-unidades");
    if (!card) return;
    var form = $("#form-unidades", card);
    var catSelect = $("#unit-category", card);
    var fromSelect = $("#unit-from", card), toSelect = $("#unit-to", card);
    var valueInput = $("#unit-value", card);
    var errorBanner = $("#unidades-error-banner", card);
    var resultPanel = $("#unidades-result", card);
    var resultValue = $("#unidades-result-value", card);
    var resultExplain = $("#unidades-result-explain", card);
    var swapBtn = $("[data-action='swap-units']", card);

    function populateUnits(categoryKey, preferFrom, preferTo) {
      var cat = BRAND.unitCategories[categoryKey];
      var keys = Object.keys(cat.units);
      fromSelect.innerHTML = keys.map(function (k) { return '<option value="' + k + '">' + escHTML(cat.units[k].label) + "</option>"; }).join("");
      toSelect.innerHTML = fromSelect.innerHTML;
      fromSelect.value = keys.indexOf(preferFrom) !== -1 ? preferFrom : keys[0];
      toSelect.value = keys.indexOf(preferTo) !== -1 ? preferTo : keys[Math.min(1, keys.length - 1)];
    }
    catSelect.addEventListener("change", function () {
      populateUnits(catSelect.value);
      resultPanel.classList.remove("is-visible");
    });
    populateUnits(catSelect.value || "longitud", "km", "mi");

    swapBtn.addEventListener("click", function () {
      var tmp = fromSelect.value;
      fromSelect.value = toSelect.value;
      toSelect.value = tmp;
      if (resultPanel.classList.contains("is-visible")) form.requestSubmit();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      hideError(errorBanner);
      var val = readFloat(valueInput);
      if (!isFinite(val)) { valueInput.classList.add("is-invalid"); showError(errorBanner, "Introduce un número válido."); return; }
      valueInput.classList.remove("is-invalid");
      var cat = BRAND.unitCategories[catSelect.value];
      var result = Calc.convertUnit(cat, val, fromSelect.value, toSelect.value);
      var fromLabel = cat.units[fromSelect.value].label;
      var toLabel = cat.units[toSelect.value].label;
      var symbolMatch = toLabel.match(/\(([^)]+)\)/);
      var toSymbol = symbolMatch ? symbolMatch[1] : toSelect.value;
      resultValue.textContent = Calc.formatNumber(result, 4).replace(/,?0+$/, "").replace(/,$/, "") + " " + toSymbol;
      resultExplain.textContent = Calc.formatNumber(val, 4) + " " + fromLabel + " equivalen a " + Calc.formatNumber(result, 4) + " " + toLabel + ".";
      resultPanel.classList.add("is-visible");
    });
  }

  /* ===========================================================
     10. Conversor de divisas (demo)
     =========================================================== */
  function initCurrencyConverter() {
    var card = $("#calc-conversor-divisas");
    if (!card) return;
    var form = $("#form-divisas", card);
    var fromSelect = $("#currency-from", card), toSelect = $("#currency-to", card);
    var amountInput = $("#currency-amount", card);
    var errorBanner = $("#divisas-error-banner", card);
    var resultPanel = $("#divisas-result", card);
    var resultValue = $("#divisas-result-value", card);
    var resultExplain = $("#divisas-result-explain", card);
    var swapBtn = $("[data-action='swap-currency']", card);

    swapBtn.addEventListener("click", function () {
      var tmp = fromSelect.value; fromSelect.value = toSelect.value; toSelect.value = tmp;
      if (resultPanel.classList.contains("is-visible")) form.requestSubmit();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      hideError(errorBanner);
      var amount = readFloat(amountInput);
      if (!isFinite(amount) || amount < 0) { amountInput.classList.add("is-invalid"); showError(errorBanner, "Introduce una cantidad válida."); return; }
      amountInput.classList.remove("is-invalid");
      var result = Calc.convertCurrency(BRAND.currency.ratesBaseEUR, amount, fromSelect.value, toSelect.value);
      resultValue.textContent = Calc.formatNumber(result, 2) + " " + toSelect.value;
      resultExplain.textContent = Calc.formatNumber(amount, 2) + " " + fromSelect.value + " ≈ " + Calc.formatNumber(result, 2) + " " + toSelect.value + " (tipo de cambio de demostración).";
      resultPanel.classList.add("is-visible");
    });
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  function boot() {
    safe(initNav, "initNav");
    safe(initReveals, "initReveals");
    safe(initSearch, "initSearch");
    safe(initCategoryFilter, "initCategoryFilter");
    safe(initResultActions, "initResultActions");

    safe(initPercentCalc, "initPercentCalc");
    safe(initVatCalc, "initVatCalc");
    safe(initAgeCalc, "initAgeCalc");
    safe(initCompoundInterestCalc, "initCompoundInterestCalc");
    safe(initSalaryCalc, "initSalaryCalc");
    safe(initBmiCalc, "initBmiCalc");
    safe(initDaysBetweenCalc, "initDaysBetweenCalc");
    safe(initPaceCalc, "initPaceCalc");
    safe(initUnitConverter, "initUnitConverter");
    safe(initCurrencyConverter, "initCurrencyConverter");

    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
