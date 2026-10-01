/* Materiales descargables de ejemplo (se generan en el navegador).
   En producción cada material es un archivo real subido desde el panel. */

const sheet = (rows) => "﻿" + rows.map((r) => r.join(";")).join("\n");

const GEN = {
  desperdicios: () => ({
    ext: "csv",
    body: sheet([
      ["Relevamiento de desperdicios — Amplifia"],
      [],
      ["Proceso / sector", "Desperdicio (TIMWOODS)", "Qué se observó", "Frecuencia", "Impacto (1-5)", "Idea de mejora", "Responsable"],
      ["Ej.: Preparación de pedidos", "Movimiento", "El preparador cruza el depósito 12 veces por turno", "Diaria", "4", "Ubicar los 20 ítems de mayor rotación cerca del despacho", ""],
      ...Array.from({ length: 12 }, () => ["", "", "", "", "", "", ""]),
      [],
      ["T = Transporte · I = Inventario · M = Movimiento · W = Esperas · O = Sobreproducción · O = Sobreprocesamiento · D = Defectos · S = Talento no aprovechado"],
    ]),
  }),
  vsm: () => ({
    ext: "csv",
    body: sheet([
      ["Datos para el mapa de flujo de valor (VSM) — estado actual"],
      [],
      ["Paso", "Tiempo de ciclo (min)", "Tiempo de preparación (min)", "Personas", "Inventario antes del paso (unid.)", "Espera antes del paso (h)", "¿Agrega valor? (S/N)", "Observaciones"],
      ...Array.from({ length: 10 }, (_, i) => [`${i + 1}`, "", "", "", "", "", "", ""]),
      [],
      ["Lead time total (h)", "=SUMA(F4:F13)"],
      ["Tiempo de valor agregado (min)", "Sumar los tiempos de ciclo de los pasos marcados con S"],
    ]),
  }),
  plan90: () => ({
    ext: "csv",
    body: sheet([
      ["Plan de implementación de 90 días"],
      [],
      ["Acción", "Responsable", "Inicio", "Fin", "Indicador", "Línea de base", "Meta día 30", "Meta día 60", "Meta día 90", "Estado"],
      ...Array.from({ length: 12 }, () => ["", "", "", "", "", "", "", "", "", "Pendiente"]),
    ]),
  }),
  desdehacia: () => ({
    ext: "csv",
    body: sheet([
      ["Matriz desde-hacia (viajes o cargas por día)"],
      [],
      ["Desde \\ Hacia", "Recepción", "Depósito MP", "Producción", "Control", "Depósito PT", "Despacho"],
      ...["Recepción", "Depósito MP", "Producción", "Control", "Depósito PT", "Despacho"].map((a) => [a, "", "", "", "", "", ""]),
    ]),
  }),
  slp: () => ({
    ext: "csv",
    body: sheet([
      ["Matriz de relaciones SLP"],
      ["Códigos: A = absolutamente necesaria · E = especialmente importante · I = importante · O = ordinaria · U = sin importancia · X = no deseable"],
      [],
      ["Área", "Recepción", "Depósito MP", "Producción", "Control", "Depósito PT", "Despacho", "Oficinas", "Motivo"],
      ...["Recepción", "Depósito MP", "Producción", "Control", "Depósito PT", "Despacho", "Oficinas"].map((a) => [a, "", "", "", "", "", "", "", ""]),
    ]),
  }),
  auditoria5s: () => ({
    ext: "csv",
    body: sheet([
      ["Checklist de auditoría 5S", "", "Sector:", "", "Fecha:", ""],
      ["Puntaje: 0 = no cumple · 1 = parcial · 2 = cumple"],
      [],
      ["S", "Ítem", "Puntaje", "Observación"],
      ["Clasificar", "No hay elementos innecesarios en el sector", "", ""],
      ["Clasificar", "Los elementos con tarjeta roja tienen destino definido", "", ""],
      ["Ordenar", "Cada elemento tiene un lugar identificado", "", ""],
      ["Ordenar", "Lo de uso frecuente está al alcance", "", ""],
      ["Limpiar", "Pisos, equipos y puestos limpios", "", ""],
      ["Limpiar", "Las fuentes de suciedad están identificadas", "", ""],
      ["Estandarizar", "Hay estándares visuales (fotos, marcas, carteles)", "", ""],
      ["Estandarizar", "Los estándares están actualizados", "", ""],
      ["Sostener", "Se realiza la auditoría con la frecuencia acordada", "", ""],
      ["Sostener", "Las acciones de la auditoría anterior están cerradas", "", ""],
      [],
      ["Total", "", "=SUMA(C5:C14)", "Máximo 20"],
    ]),
  }),
  a3: () => ({
    ext: "txt",
    body: [
      "REPORTE A3 — Amplifia",
      "Título del problema: ______________________   Responsable: __________   Fecha: ________",
      "",
      "1. CONTEXTO — ¿Por qué es importante este problema?",
      "",
      "2. SITUACIÓN ACTUAL — ¿Qué está pasando? (datos, gráfico, lugar)",
      "",
      "3. OBJETIVO — ¿Qué queremos lograr y para cuándo? (medible)",
      "",
      "4. ANÁLISIS DE CAUSAS — 5 porqués / Ishikawa",
      "",
      "5. CONTRAMEDIDAS — ¿Qué vamos a hacer sobre cada causa raíz?",
      "",
      "6. PLAN — Qué · Quién · Cuándo",
      "",
      "7. SEGUIMIENTO — ¿Cómo verificamos que funcionó? ¿Qué estandarizamos?",
    ].join("\n"),
  }),
  feedback: () => ({
    ext: "txt",
    body: [
      "GUÍA DE CONVERSACIÓN DE FEEDBACK — Amplifia",
      "",
      "Antes",
      "- ¿Cuál es el objetivo de la conversación?",
      "- ¿Qué hechos concretos observé? (fecha, situación)",
      "- ¿Cuál fue el impacto?",
      "",
      "Durante",
      "1. Pedir permiso: «¿Tenés unos minutos? Quiero compartirte algo que vi.»",
      "2. Situación: «El martes, en la reunión con el cliente…»",
      "3. Conducta: «…interrumpiste dos veces su explicación…»",
      "4. Impacto: «…y el cliente no terminó de contar el problema.»",
      "5. Escuchar: «¿Cómo lo viste vos?»",
      "6. Acuerdo: «¿Qué podemos hacer distinto la próxima vez?»",
      "",
      "Después",
      "- Anotar el acuerdo y la fecha de revisión.",
      "- Reconocer el cambio cuando aparezca.",
    ].join("\n"),
  }),
  unoauno: () => ({
    ext: "txt",
    body: [
      "GUÍA DE REUNIÓN 1 A 1 — Amplifia",
      "Frecuencia sugerida: cada 15 días · Duración: 30 minutos · La agenda es del colaborador",
      "",
      "1. ¿Cómo estás? (5 min)",
      "2. ¿Qué está funcionando bien? (5 min)",
      "3. ¿Qué te está trabando? ¿En qué te puedo ayudar? (10 min)",
      "4. Desarrollo: ¿qué querés aprender o hacer distinto? (5 min)",
      "5. Acuerdos y próximos pasos (5 min)",
      "",
      "Registro",
      "Fecha | Temas | Acuerdos | Responsable | Para cuándo",
    ].join("\n"),
  }),
  prompts: () => ({
    ext: "txt",
    body: [
      "BIBLIOTECA DE PEDIDOS (PROMPTS) PARA GESTIÓN — Amplifia",
      "Recordá: no cargues datos personales ni confidenciales en herramientas no aprobadas.",
      "",
      "Resumir un informe",
      "«Actuá como analista de operaciones. Resumí el siguiente informe en 5 puntos para el gerente general, destacando riesgos y decisiones pendientes. Formato: viñetas de una línea.»",
      "",
      "Preparar una reunión",
      "«Voy a tener una reunión 1 a 1 con un supervisor que viene incumpliendo plazos. Proponé 6 preguntas abiertas para entender las causas sin que se ponga a la defensiva.»",
      "",
      "Redactar un procedimiento",
      "«Convertí estas notas en un procedimiento paso a paso, con responsable y registro de cada paso, en lenguaje simple para personal operativo.»",
      "",
      "Analizar datos",
      "«Te paso una tabla con reclamos por mes y por tipo. Indicá los 3 tipos que más crecieron y proponé hipótesis de causa para verificar.»",
    ].join("\n"),
  }),
  kpi: () => ({
    ext: "csv",
    body: sheet([
      ["Ficha técnica de indicador"],
      [],
      ["Campo", "Completar"],
      ["Nombre del indicador", ""],
      ["Objetivo al que responde", ""],
      ["Definición", ""],
      ["Fórmula", ""],
      ["Unidad", ""],
      ["Fuente de datos", ""],
      ["Frecuencia de medición", ""],
      ["Responsable", ""],
      ["Meta", ""],
      ["Umbrales (verde / amarillo / rojo)", ""],
      ["Decisión que se toma con este indicador", ""],
    ]),
  }),
};

export function makeResource(gen, name) {
  const g = GEN[gen];
  if (!g) return null;
  const { ext, body } = g();
  const file = name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") + "." + ext;
  return { file, body, mime: ext === "csv" ? "text/csv;charset=utf-8" : "text/plain;charset=utf-8" };
}
