/* CalculaYa — lib/manifest.js
   Brand data, tool catalog, and lookup tables consumed by main.js and
   lib/calculators.js. Adding a new calculator later means adding one entry
   to TOOLS below (plus its own page) — nothing else in this file changes. */
(function () {
  "use strict";

  var TOOLS = [
    {
      id: "porcentajes",
      name: "Calculadora de porcentajes",
      url: "calculadora-porcentajes.html",
      category: "matematicas",
      icon: "%",
      desc: "Calcula el % de una cantidad, aumentos, descuentos y proporciones.",
      keywords: ["porcentaje", "porcentajes", "%", "descuento", "aumento", "calcular porcentaje"]
    },
    {
      id: "iva",
      name: "Calculadora de IVA",
      url: "calculadora-iva.html",
      category: "dinero",
      icon: "€",
      desc: "Añade o quita el IVA de cualquier precio (21%, 10%, 4% o personalizado).",
      keywords: ["iva", "impuesto", "precio", "quitar iva", "21", "10", "4", "iva 21"]
    },
    {
      id: "edad",
      name: "Calculadora de edad",
      url: "calculadora-edad.html",
      category: "fechas",
      icon: "🎂",
      desc: "Descubre tu edad exacta en años, meses y días, y cuándo es tu próximo cumpleaños.",
      keywords: ["edad", "cumpleaños", "nacimiento", "calcular edad", "cuantos años tengo"]
    },
    {
      id: "interes-compuesto",
      name: "Calculadora de interés compuesto",
      url: "calculadora-interes-compuesto.html",
      category: "dinero",
      icon: "📈",
      desc: "Simula el crecimiento de tus ahorros o inversiones con aportaciones periódicas.",
      keywords: ["interes", "interés", "compuesto", "ahorro", "inversion", "inversión", "interes compuesto"]
    },
    {
      id: "sueldo-neto",
      name: "Calculadora de sueldo neto",
      url: "calculadora-sueldo-neto.html",
      category: "dinero",
      icon: "💼",
      desc: "Estima tu salario neto mensual y anual a partir del bruto (España).",
      keywords: ["sueldo", "salario", "neto", "bruto", "nomina", "nómina", "irpf", "sueldo neto"]
    },
    {
      id: "imc",
      name: "Calculadora de IMC",
      url: "calculadora-imc.html",
      category: "salud",
      icon: "⚖️",
      desc: "Calcula tu Índice de Masa Corporal y consulta su interpretación.",
      keywords: ["imc", "peso", "altura", "masa corporal", "calorias", "calorías", "indice masa corporal"]
    },
    {
      id: "dias-entre-fechas",
      name: "Calculadora de días entre fechas",
      url: "calculadora-dias-entre-fechas.html",
      category: "fechas",
      icon: "📅",
      desc: "Cuenta los días, semanas, meses y años exactos entre dos fechas.",
      keywords: ["dias", "días", "fechas", "entre fechas", "cuenta atras", "cuenta atrás", "dias entre fechas"]
    },
    {
      id: "ritmo-carrera",
      name: "Calculadora de ritmo de carrera",
      url: "calculadora-ritmo-carrera.html",
      category: "salud",
      icon: "🏃",
      desc: "Calcula tu ritmo por kilómetro, velocidad media o tiempo estimado de carrera.",
      keywords: ["ritmo", "carrera", "running", "pace", "velocidad", "maraton", "maratón", "ritmo carrera"]
    },
    {
      id: "conversor-unidades",
      name: "Conversor de unidades",
      url: "conversor-unidades.html",
      category: "conversiones",
      icon: "📏",
      desc: "Convierte longitud, peso, temperatura, velocidad, área, volumen y tiempo.",
      keywords: ["conversor", "unidades", "km", "millas", "kg", "libras", "celsius", "fahrenheit", "km millas"]
    },
    {
      id: "conversor-divisas",
      name: "Conversor de divisas",
      url: "conversor-divisas.html",
      category: "dinero",
      icon: "💱",
      desc: "Convierte entre euros, dólares, libras y otras divisas importantes.",
      keywords: ["divisas", "moneda", "euro", "dolar", "dólar", "libra", "cambio", "conversor divisas"]
    }
  ];

  var CATEGORIES = [
    { id: "dinero", name: "Dinero", icon: "💰" },
    { id: "matematicas", name: "Matemáticas", icon: "📊" },
    { id: "fechas", name: "Fechas y tiempo", icon: "📅" },
    { id: "conversiones", name: "Conversiones", icon: "📏" },
    { id: "salud", name: "Salud", icon: "❤️" }
  ];

  var FEATURED_IDS = ["porcentajes", "iva", "edad", "imc", "interes-compuesto", "sueldo-neto"];

  /* ---- IVA tipos vigentes en España ---- */
  var IVA_RATES = [
    { value: 21, label: "21% (general)" },
    { value: 10, label: "10% (reducido)" },
    { value: 4, label: "4% (superreducido)" }
  ];

  /* ---- IRPF: escala general aproximada (estatal + autonómica media), año de referencia ---- */
  var IRPF_YEAR = 2024;
  var IRPF_BRACKETS = [
    { upTo: 12450, rate: 0.19 },
    { upTo: 20200, rate: 0.24 },
    { upTo: 35200, rate: 0.30 },
    { upTo: 60000, rate: 0.37 },
    { upTo: 300000, rate: 0.45 },
    { upTo: Infinity, rate: 0.47 }
  ];
  /* Pequeño ajuste orientativo por diferencias autonómicas reales (puntos porcentuales
     aplicados sobre la cuota, no sobre la base). 0 = sin ajuste conocido. */
  var CCAA_LIST = [
    { value: "madrid", label: "Madrid", adjust: -0.04 },
    { value: "cataluna", label: "Cataluña", adjust: 0.03 },
    { value: "andalucia", label: "Andalucía", adjust: -0.015 },
    { value: "valencia", label: "Comunidad Valenciana", adjust: 0.02 },
    { value: "galicia", label: "Galicia", adjust: -0.01 },
    { value: "castilla-leon", label: "Castilla y León", adjust: -0.015 },
    { value: "castilla-mancha", label: "Castilla-La Mancha", adjust: 0 },
    { value: "canarias", label: "Canarias", adjust: -0.03 },
    { value: "pais-vasco", label: "País Vasco (foral, muy orientativo)", adjust: -0.02 },
    { value: "murcia", label: "Región de Murcia", adjust: -0.005 },
    { value: "aragon", label: "Aragón", adjust: 0.015 },
    { value: "baleares", label: "Illes Balears", adjust: 0 },
    { value: "asturias", label: "Principado de Asturias", adjust: 0.025 },
    { value: "extremadura", label: "Extremadura", adjust: -0.01 },
    { value: "navarra", label: "Navarra (foral, muy orientativo)", adjust: -0.015 },
    { value: "cantabria", label: "Cantabria", adjust: 0 },
    { value: "la-rioja", label: "La Rioja", adjust: 0 },
    { value: "ceuta-melilla", label: "Ceuta y Melilla", adjust: -0.05 }
  ];
  var SS_EMPLOYEE_RATE = { indefinido: 0.0635, temporal: 0.0640, practicas: 0.0635 };
  var MINIMO_PERSONAL = { soltero: 5550, casado: 8950, hijos: 7950 };

  /* ---- Conversor de unidades: tablas de factores hacia una unidad base ---- */
  var UNIT_CATEGORIES = {
    longitud: {
      label: "Longitud",
      base: "m",
      units: {
        mm: { label: "Milímetros (mm)", factor: 0.001 },
        cm: { label: "Centímetros (cm)", factor: 0.01 },
        m: { label: "Metros (m)", factor: 1 },
        km: { label: "Kilómetros (km)", factor: 1000 },
        in: { label: "Pulgadas (in)", factor: 0.0254 },
        ft: { label: "Pies (ft)", factor: 0.3048 },
        yd: { label: "Yardas (yd)", factor: 0.9144 },
        mi: { label: "Millas (mi)", factor: 1609.344 }
      }
    },
    peso: {
      label: "Peso",
      base: "kg",
      units: {
        mg: { label: "Miligramos (mg)", factor: 0.000001 },
        g: { label: "Gramos (g)", factor: 0.001 },
        kg: { label: "Kilogramos (kg)", factor: 1 },
        t: { label: "Toneladas (t)", factor: 1000 },
        lb: { label: "Libras (lb)", factor: 0.45359237 },
        oz: { label: "Onzas (oz)", factor: 0.028349523125 }
      }
    },
    temperatura: {
      label: "Temperatura",
      base: "c",
      affine: true,
      units: {
        c: { label: "Celsius (°C)" },
        f: { label: "Fahrenheit (°F)" },
        k: { label: "Kelvin (K)" }
      }
    },
    velocidad: {
      label: "Velocidad",
      base: "ms",
      units: {
        ms: { label: "Metros/segundo (m/s)", factor: 1 },
        kmh: { label: "Kilómetros/hora (km/h)", factor: 1 / 3.6 },
        mph: { label: "Millas/hora (mph)", factor: 0.44704 },
        knot: { label: "Nudos (kn)", factor: 0.514444 }
      }
    },
    area: {
      label: "Área",
      base: "m2",
      units: {
        mm2: { label: "Milímetros² (mm²)", factor: 0.000001 },
        cm2: { label: "Centímetros² (cm²)", factor: 0.0001 },
        m2: { label: "Metros² (m²)", factor: 1 },
        km2: { label: "Kilómetros² (km²)", factor: 1000000 },
        ha: { label: "Hectáreas (ha)", factor: 10000 },
        ft2: { label: "Pies² (ft²)", factor: 0.09290304 },
        acre: { label: "Acres", factor: 4046.8564224 }
      }
    },
    volumen: {
      label: "Volumen",
      base: "l",
      units: {
        ml: { label: "Mililitros (ml)", factor: 0.001 },
        l: { label: "Litros (l)", factor: 1 },
        m3: { label: "Metros³ (m³)", factor: 1000 },
        gal_us: { label: "Galones US (gal)", factor: 3.785411784 },
        pt_us: { label: "Pintas US (pt)", factor: 0.473176473 }
      }
    },
    tiempo: {
      label: "Tiempo",
      base: "s",
      units: {
        s: { label: "Segundos (s)", factor: 1 },
        min: { label: "Minutos (min)", factor: 60 },
        h: { label: "Horas (h)", factor: 3600 },
        dia: { label: "Días", factor: 86400 },
        semana: { label: "Semanas", factor: 604800 },
        mes: { label: "Meses (30 días)", factor: 2592000 },
        anio: { label: "Años (365 días)", factor: 31536000 }
      }
    }
  };

  /* ---- Conversor de divisas: DATOS DE DEMOSTRACIÓN ----
     No son tipos de cambio reales/en vivo. Sirven para que la herramienta
     funcione desde el primer día. Cuando se integre una API real (p. ej.
     exchangerate.host, Frankfurter u otra sin coste), sustituir esta tabla
     por la respuesta de fetchLiveRates() en lib/calculators.js — el resto
     del código (UI, validaciones) no necesita cambiar. */
  var CURRENCY_DEMO_RATES_BASE_EUR = {
    EUR: 1,
    USD: 1.09,
    GBP: 0.85,
    CHF: 0.95,
    JPY: 163.2,
    CAD: 1.47,
    AUD: 1.63,
    MXN: 18.55,
    BRL: 5.85,
    CNY: 7.82
  };
  var CURRENCY_LABELS = {
    EUR: "Euro (EUR)",
    USD: "Dólar estadounidense (USD)",
    GBP: "Libra esterlina (GBP)",
    CHF: "Franco suizo (CHF)",
    JPY: "Yen japonés (JPY)",
    CAD: "Dólar canadiense (CAD)",
    AUD: "Dólar australiano (AUD)",
    MXN: "Peso mexicano (MXN)",
    BRL: "Real brasileño (BRL)",
    CNY: "Yuan chino (CNY)"
  };
  var CURRENCY_DEMO_UPDATED = "2026-01-01";

  window.__BRAND__ = {
    name: "CalculaYa",
    tagline: "Calculadoras online gratuitas",
    baseUrl: "",
    tools: TOOLS,
    categories: CATEGORIES,
    featuredIds: FEATURED_IDS,
    ivaRates: IVA_RATES,
    irpf: { year: IRPF_YEAR, brackets: IRPF_BRACKETS, ccaa: CCAA_LIST, ssRate: SS_EMPLOYEE_RATE, minimoPersonal: MINIMO_PERSONAL },
    unitCategories: UNIT_CATEGORIES,
    currency: {
      ratesBaseEUR: CURRENCY_DEMO_RATES_BASE_EUR,
      labels: CURRENCY_LABELS,
      demoUpdated: CURRENCY_DEMO_UPDATED,
      isDemo: true
    }
  };
})();
