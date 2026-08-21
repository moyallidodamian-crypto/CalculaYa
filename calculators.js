/* CalculaYa — lib/calculators.js
   Pure calculation engines. No DOM access here — every function takes plain
   numbers/strings and returns plain data, so each one can be wired to a page
   (or a future unit test) independently of how the page renders results. */
(function () {
  "use strict";

  var Calc = {};

  /* ---------------------------------------------------------
     Helpers
     --------------------------------------------------------- */
  function round(n, decimals) {
    var d = Math.pow(10, decimals == null ? 2 : decimals);
    return Math.round((n + Number.EPSILON) * d) / d;
  }
  Calc.round = round;

  function formatNumber(n, decimals) {
    if (!isFinite(n)) return "—";
    return new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: decimals == null ? 0 : decimals,
      maximumFractionDigits: decimals == null ? 2 : decimals
    }).format(n);
  }
  Calc.formatNumber = formatNumber;

  function formatCurrency(n, currency) {
    if (!isFinite(n)) return "—";
    try {
      return new Intl.NumberFormat("es-ES", { style: "currency", currency: currency || "EUR", maximumFractionDigits: 2 }).format(n);
    } catch (e) {
      return formatNumber(n, 2) + " " + (currency || "EUR");
    }
  }
  Calc.formatCurrency = formatCurrency;

  /* UTC-midnight day diff — dodges DST off-by-one errors. */
  function utcMidnight(y, m, d) { return Date.UTC(y, m, d); }
  function daysBetweenUTC(a, b) {
    return Math.round((utcMidnight(b.getFullYear(), b.getMonth(), b.getDate()) -
      utcMidnight(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
  }
  Calc.daysBetweenUTC = daysBetweenUTC;

  /* ---------------------------------------------------------
     1. Porcentajes
     --------------------------------------------------------- */
  Calc.percentOf = function (percent, amount) {
    return { result: (percent / 100) * amount, formula: (percent) + "% de " + amount + " = (" + percent + " / 100) × " + amount };
  };
  Calc.whatPercent = function (part, whole) {
    if (whole === 0) return { result: NaN, formula: "" };
    var pct = (part / whole) * 100;
    return { result: pct, formula: part + " es el " + round(pct, 2) + "% de " + whole + " = (" + part + " / " + whole + ") × 100" };
  };
  Calc.increaseBy = function (amount, percent) {
    var result = amount * (1 + percent / 100);
    return { result: result, delta: result - amount, formula: amount + " + " + percent + "% = " + amount + " × (1 + " + percent + "/100)" };
  };
  Calc.decreaseBy = function (amount, percent) {
    var result = amount * (1 - percent / 100);
    return { result: result, delta: amount - result, formula: amount + " − " + percent + "% = " + amount + " × (1 − " + percent + "/100)" };
  };

  /* ---------------------------------------------------------
     2. IVA
     --------------------------------------------------------- */
  Calc.addVAT = function (base, rate) {
    var vat = base * (rate / 100);
    return { base: base, vat: vat, total: base + vat };
  };
  Calc.removeVAT = function (total, rate) {
    var base = total / (1 + rate / 100);
    var vat = total - base;
    return { base: base, vat: vat, total: total };
  };
  Calc.extractVAT = function (total, rate) {
    var base = total / (1 + rate / 100);
    var vat = total - base;
    return { base: base, vat: vat, total: total };
  };

  /* ---------------------------------------------------------
     3. Edad
     --------------------------------------------------------- */
  Calc.calculateAge = function (birthDate, today) {
    today = today || new Date();
    var b = new Date(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    var t = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    var years = t.getFullYear() - b.getFullYear();
    var months = t.getMonth() - b.getMonth();
    var days = t.getDate() - b.getDate();
    if (days < 0) {
      months -= 1;
      var prevMonth = new Date(t.getFullYear(), t.getMonth(), 0).getDate();
      days += prevMonth;
    }
    if (months < 0) { months += 12; years -= 1; }

    var totalDays = daysBetweenUTC(b, t);

    var nextBirthday = new Date(t.getFullYear(), b.getMonth(), b.getDate());
    if (nextBirthday.getTime() < t.getTime()) {
      nextBirthday = new Date(t.getFullYear() + 1, b.getMonth(), b.getDate());
    } else if (nextBirthday.getTime() === t.getTime()) {
      // today IS the birthday — next one is a year away
      nextBirthday = new Date(t.getFullYear() + 1, b.getMonth(), b.getDate());
    }
    var daysToNextBirthday = daysBetweenUTC(t, nextBirthday);

    return { years: years, months: months, days: days, totalDays: totalDays, nextBirthday: nextBirthday, daysToNextBirthday: daysToNextBirthday };
  };

  /* ---------------------------------------------------------
     4. Interés compuesto
     --------------------------------------------------------- */
  Calc.compoundInterest = function (opts) {
    var principal = opts.principal || 0;
    var contribution = opts.contribution || 0;
    var frequency = opts.frequency || "mensual"; // mensual | trimestral | anual
    var annualRate = opts.annualRate || 0;
    var years = opts.years || 0;

    var months = Math.round(years * 12);
    var monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
    var contribInterval = frequency === "mensual" ? 1 : frequency === "trimestral" ? 3 : 12;

    var balance = principal;
    var contributed = principal;
    var history = [{ month: 0, balance: balance, contributed: contributed }];

    for (var m = 1; m <= months; m++) {
      balance *= (1 + monthlyRate);
      if (m % contribInterval === 0) {
        balance += contribution;
        contributed += contribution;
      }
      if (m % 12 === 0 || m === months) {
        history.push({ month: m, balance: balance, contributed: contributed });
      }
    }

    return {
      finalBalance: balance,
      totalContributed: contributed,
      totalInterest: balance - contributed,
      history: history
    };
  };

  /* ---------------------------------------------------------
     5. Sueldo neto (España, orientativo)
     --------------------------------------------------------- */
  function progressiveTax(base, brackets) {
    var tax = 0, prev = 0;
    for (var i = 0; i < brackets.length; i++) {
      var b = brackets[i];
      if (base > prev) {
        var taxable = Math.min(base, b.upTo) - prev;
        tax += taxable * b.rate;
        prev = b.upTo;
      } else break;
    }
    return tax;
  }
  Calc.netSalary = function (opts, tables) {
    var brutoAnual = opts.brutoAnual || 0;
    var pagas = opts.pagas || 12;
    var situacion = opts.situacion || "soltero";
    var ccaaValue = opts.ccaa;
    var contrato = opts.contrato || "indefinido";

    var ssRate = tables.ssRate[contrato] || tables.ssRate.indefinido;
    var ss = brutoAnual * ssRate;

    var minimoPersonal = tables.minimoPersonal[situacion] || tables.minimoPersonal.soltero;
    var baseImponible = Math.max(0, brutoAnual - ss - minimoPersonal);

    var ccaaEntry = null;
    for (var i = 0; i < tables.ccaa.length; i++) { if (tables.ccaa[i].value === ccaaValue) { ccaaEntry = tables.ccaa[i]; break; } }
    var adjust = ccaaEntry ? ccaaEntry.adjust : 0;

    var irpfBase = progressiveTax(baseImponible, tables.brackets);
    var irpf = Math.max(0, irpfBase * (1 + adjust));

    var netoAnual = brutoAnual - ss - irpf;
    var netoMensual = netoAnual / pagas;
    var brutoMensual = brutoAnual / pagas;
    var tipoEfectivo = brutoAnual > 0 ? (irpf / brutoAnual) * 100 : 0;

    return {
      brutoMensual: brutoMensual,
      seguridadSocial: ss,
      irpf: irpf,
      netoMensual: netoMensual,
      netoAnual: netoAnual,
      tipoEfectivo: tipoEfectivo,
      ssMensual: ss / pagas
    };
  };

  /* ---------------------------------------------------------
     6. IMC
     --------------------------------------------------------- */
  Calc.bmi = function (weightKg, heightCm) {
    var h = heightCm / 100;
    var bmi = weightKg / (h * h);
    var category, interpretation;
    if (bmi < 18.5) { category = "Peso bajo"; interpretation = "Tu peso está por debajo del rango considerado saludable para tu altura."; }
    else if (bmi < 25) { category = "Peso normal"; interpretation = "Tu peso se encuentra dentro del rango considerado saludable."; }
    else if (bmi < 30) { category = "Sobrepeso"; interpretation = "Tu peso está algo por encima del rango saludable."; }
    else if (bmi < 35) { category = "Obesidad grado I"; interpretation = "Tu IMC indica obesidad grado I."; }
    else if (bmi < 40) { category = "Obesidad grado II"; interpretation = "Tu IMC indica obesidad grado II."; }
    else { category = "Obesidad grado III"; interpretation = "Tu IMC indica obesidad grado III (mórbida)."; }
    return { bmi: bmi, category: category, interpretation: interpretation };
  };

  /* ---------------------------------------------------------
     7. Días entre fechas
     --------------------------------------------------------- */
  Calc.daysBetween = function (start, end) {
    var totalDays = daysBetweenUTC(start, end);
    var weeks = totalDays / 7;
    var months = totalDays / 30.4368;
    var years = totalDays / 365.25;
    return { totalDays: totalDays, weeks: weeks, months: months, years: years };
  };
  Calc.daysUntil = function (target, today) {
    today = today || new Date();
    var totalDays = daysBetweenUTC(today, target);
    return { totalDays: totalDays, isPast: totalDays < 0 };
  };

  /* ---------------------------------------------------------
     8. Conversor de unidades
     --------------------------------------------------------- */
  function celsiusFrom(unit, value) {
    if (unit === "c") return value;
    if (unit === "f") return (value - 32) * (5 / 9);
    if (unit === "k") return value - 273.15;
  }
  function celsiusTo(unit, celsius) {
    if (unit === "c") return celsius;
    if (unit === "f") return celsius * (9 / 5) + 32;
    if (unit === "k") return celsius + 273.15;
  }
  Calc.convertUnit = function (categoryData, value, fromUnit, toUnit) {
    if (categoryData.affine) {
      var c = celsiusFrom(fromUnit, value);
      return celsiusTo(toUnit, c);
    }
    var fromFactor = categoryData.units[fromUnit].factor;
    var toFactor = categoryData.units[toUnit].factor;
    var base = value * fromFactor;
    return base / toFactor;
  };

  /* ---------------------------------------------------------
     9. Conversor de divisas (demo — ver lib/manifest.js)
     --------------------------------------------------------- */
  Calc.convertCurrency = function (ratesBaseEUR, amount, fromCode, toCode) {
    var fromRate = ratesBaseEUR[fromCode];
    var toRate = ratesBaseEUR[toCode];
    if (!fromRate || !toRate) return NaN;
    var amountInEUR = amount / fromRate;
    return amountInEUR * toRate;
  };
  /* Integration point for a real, keyless exchange-rate API. Not called by
     default — the site ships in demo mode (invariant: no paid APIs, ever).
     To go live: implement the fetch here, cache the result (e.g. localStorage,
     1x/day), and feed it into convertCurrency() instead of ratesBaseEUR. */
  Calc.fetchLiveRates = function () {
    return Promise.reject(new Error("Live rates not configured — using demo data. See lib/calculators.js fetchLiveRates()."));
  };

  /* ---------------------------------------------------------
     10. Ritmo de carrera
     --------------------------------------------------------- */
  Calc.paceFromDistanceTime = function (distanceKm, totalSeconds) {
    var secPerKm = totalSeconds / distanceKm;
    var speedKmh = distanceKm / (totalSeconds / 3600);
    return { secPerKm: secPerKm, speedKmh: speedKmh };
  };
  Calc.timeFromDistancePace = function (distanceKm, secPerKm) {
    return distanceKm * secPerKm;
  };
  Calc.distanceFromTimePace = function (totalSeconds, secPerKm) {
    return totalSeconds / secPerKm;
  };
  Calc.formatPace = function (secPerKm) {
    var m = Math.floor(secPerKm / 60);
    var s = Math.round(secPerKm % 60);
    if (s === 60) { m += 1; s = 0; }
    return m + ":" + (s < 10 ? "0" : "") + s + " /km";
  };
  Calc.formatDuration = function (totalSeconds) {
    totalSeconds = Math.round(totalSeconds);
    var h = Math.floor(totalSeconds / 3600);
    var m = Math.floor((totalSeconds % 3600) / 60);
    var s = totalSeconds % 60;
    var parts = [];
    if (h > 0) parts.push(h + "h");
    parts.push((h > 0 && m < 10 ? "0" : "") + m + "m");
    parts.push((s < 10 ? "0" : "") + s + "s");
    return parts.join(" ");
  };
  Calc.parseHMS = function (str) {
    var parts = String(str).split(":").map(function (p) { return parseFloat(p); });
    if (parts.some(isNaN)) return NaN;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return NaN;
  };

  window.__CALC__ = Calc;
})();
