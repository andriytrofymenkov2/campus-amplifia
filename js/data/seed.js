/* =========================================================================
   DATOS DE DEMOSTRACIÓN
   Todo el contenido de este archivo es de EJEMPLO (borradores para mostrar
   la plataforma funcionando). Los alumnos, empresas, opiniones y preguntas
   son ficticios. Al conectar el backend real se reemplaza por lo que carguen
   los instructores desde el panel de administración.
   ========================================================================= */

/* Cuentas de prueba del modo demo (también accesibles con los botones de la pantalla de ingreso) */
export const DEMO_ACCOUNTS = {
  alumno: { user: "martina", pass: "campus2026" },
  admin: { user: "admin", pass: "amplifia2026" },
};

export const CATEGORIES = [
  { id: "procesos", name: "Procesos y operaciones", short: "Procesos" },
  { id: "mejora", name: "Mejora continua", short: "Mejora continua" },
  { id: "liderazgo", name: "Liderazgo y coaching", short: "Liderazgo" },
  { id: "equipos", name: "Equipos y desarrollo comercial", short: "Equipos" },
  { id: "ia", name: "Inteligencia artificial", short: "IA" },
  { id: "datos", name: "Datos y decisiones", short: "Datos" },
];

export const INSTRUCTORS = [
  {
    id: "andriy", name: "Andriy Trofymenko", role: "Ingeniero industrial · Procesos y operaciones", photo: "img/people/andriy.jpg", portrait: "img/people/andriy_p.jpg",
    bio: "Ingeniero industrial con posgrado en Industria 4.0 (UNSAM). Rediseña procesos, distribuciones de planta y sistemas de gestión en industria, salud y servicios. Lleva la mirada de procesos de Amplifia.",
  },
  {
    id: "christian", name: "Christian Pollavini", role: "Coach de líderes · Personas y equipos", photo: "img/people/christian.jpg", portrait: "img/people/christian_p.jpg",
    bio: "Coach de líderes y fundador de CP Coaching & Training. Consultor certificado en performance comercial y experiencia del cliente. Lleva la mirada de personas de Amplifia.",
  },
];

/* Atajos para escribir lecciones */
const V = (t, min, v, sum, extra = {}) => ({ t, type: "video", min, v, sum, ...extra });
const R = (t, min, body, extra = {}) => ({ t, type: "lectura", min, body, ...extra });
const Q = (t, qs) => ({ t, type: "quiz", min: Math.max(3, qs.length * 2), qs });
const q = (text, o, a, e) => ({ q: text, o, a, e });

export const COURSES = [
  /* ------------------------------------------------------------------ */
  {
    key: "lean", slug: "lean-en-la-practica", title: "Lean en la práctica", subtitle: "Eliminá desperdicios y hacé que el trabajo fluya",
    cat: "procesos", level: "Inicial", instructors: ["andriy"], cover: "img/covers/lean.jpg", featured: true, updated: -16,
    desc: "Un recorrido práctico por el pensamiento Lean aplicado a plantas, depósitos y oficinas. Vas a aprender a ver el desperdicio, mapear el flujo de valor y armar un plan de mejora de 90 días con resultados medibles.",
    outcomes: ["Identificar los 8 desperdicios en cualquier proceso", "Construir el mapa de flujo de valor (VSM) actual y futuro", "Calcular lead time, tiempo de valor agregado y eficiencia del proceso", "Aplicar flujo continuo, sistema pull y trabajo estandarizado", "Armar un plan de implementación de 90 días con indicadores"],
    forWho: "Responsables de operaciones, supervisores, analistas de procesos y mandos medios de industria, logística, salud y servicios.",
    req: "No hace falta experiencia previa.",
    modules: [
      { t: "Pensar en Lean", lessons: [
        V("Qué es Lean (y qué no es)", 9, "ink", "Lean no es recortar personal ni una caja de herramientas: es un sistema para entregar más valor con menos esfuerzo, tiempo y recursos.", { pts: ["Nace en el Sistema de Producción Toyota", "Mira el flujo de valor completo, no cada área por separado", "Se apoya en dos pilares: mejora continua y respeto por las personas"] }),
        V("Valor desde la mirada del cliente", 8, "drops", "Todo lo que el cliente no está dispuesto a pagar es una oportunidad de mejora.", { pts: ["Actividades que agregan valor", "Actividades necesarias sin valor agregado", "Desperdicio puro: eliminar"] }),
        V("Los 8 desperdicios", 14, "wave", "Transporte, inventario, movimiento, esperas, sobreproducción, sobreprocesamiento, defectos y talento no aprovechado: cómo reconocerlos en tu día a día.", { pts: ["Regla mnemotécnica TIMWOODS", "Ejemplos en planta y en oficina", "Cómo relevarlos en una recorrida de 30 minutos"], res: [{ n: "Planilla de relevamiento de desperdicios", k: "xlsx", gen: "desperdicios" }] }),
        Q("Control del módulo 1", [
          q("¿Qué parte del proceso agrega valor?", ["La que transforma el producto o servicio de una forma que el cliente valora y paga", "Toda actividad que hace la empresa", "Las inspecciones de calidad", "Los traslados entre áreas"], 0, "Agrega valor lo que transforma el producto o servicio y el cliente está dispuesto a pagar."),
          q("Un informe que se prepara todas las semanas y nadie lee es…", ["Sobreprocesamiento", "Transporte", "Inventario", "Valor agregado"], 0, "Hacer más de lo que el cliente (interno o externo) necesita es sobreprocesamiento."),
          q("El octavo desperdicio es…", ["Talento no aprovechado", "Energía", "Papel", "Reuniones"], 0, "No aprovechar las ideas y capacidades de las personas es el octavo desperdicio."),
        ]),
      ] },
      { t: "Ver el flujo", lessons: [
        V("Mapa de flujo de valor paso a paso", 16, "light", "Cómo dibujar el VSM del estado actual: proceso, inventarios, flujo de información y línea de tiempo.", { pts: ["Elegir la familia de productos", "Caminar el proceso de punta a punta", "Dibujar con lápiz antes que con software"], res: [{ n: "Plantilla de datos para el VSM", k: "xlsx", gen: "vsm" }] }),
        V("Lead time, tiempo de ciclo y valor agregado", 11, "mist", "Las tres medidas que muestran cuánto tarda de verdad tu proceso y cuánto de ese tiempo vale para el cliente.", { pts: ["Lead time: del pedido a la entrega", "Tiempo de ciclo: cada cuánto sale una unidad", "Eficiencia = valor agregado / lead time"] }),
        R("Caso: el recorrido de un pedido", 6, [
          "Un pedido de un cliente industrial tardaba, en promedio, cinco días corridos entre que ingresaba por correo y salía del depósito. Cuando el equipo cronometró las tareas que realmente transformaban algo —cargar el pedido, preparar, controlar y embalar— sumaron apenas 40 minutos.",
          "El resto era espera: el correo sin leer hasta la tarde, la aprobación de crédito que se hacía una vez por día, la preparación por tandas y un control final que esperaba a que se juntaran varios pedidos.",
          "Con el mapa en la pared, la conversación cambió. Ya no se discutía quién trabajaba más o menos, sino dónde se frenaba el pedido. Las primeras tres mejoras no costaron nada: revisar pedidos cada dos horas, aprobar crédito en línea para clientes habituales y preparar pedido por pedido.",
          "Preguntas para tu proceso: ¿cuánto tarda de punta a punta? ¿Cuánto de ese tiempo alguien está agregando valor? ¿Dónde se acumula trabajo esperando?",
        ]),
      ] },
      { t: "Herramientas para fluir", lessons: [
        V("Flujo continuo y sistema pull", 12, "fil", "Pasar de trabajar por lotes a trabajar al ritmo de lo que el cliente consume.", { pts: ["Por qué los lotes grandes esconden problemas", "Supermercados y kanban", "Cuándo conviene y cuándo no"] }),
        V("Trabajo estandarizado", 10, "rise", "La mejor forma conocida de hacer una tarea, escrita y visible, como base para seguir mejorando.", { pts: ["Secuencia, tiempo y stock estándar", "Hojas de instrucción que se usan", "El estándar se mejora, no se impone"] }),
        V("Gestión visual y tableros de piso", 9, "drops", "Que cualquiera pueda saber en segundos si el proceso va bien o mal.", { pts: ["Indicadores a la vista de quien hace el trabajo", "Señales de anomalía", "Reunión diaria frente al tablero"] }),
      ] },
      { t: "Implementar sin perder impulso", lessons: [
        V("Plan de 90 días", 10, "ink", "Cómo priorizar, asignar responsables y medir para que la mejora no quede en un taller lindo.", { pts: ["Elegir un flujo piloto", "Metas medibles al día 30, 60 y 90", "Ritmo de seguimiento semanal"], res: [{ n: "Plantilla de plan de 90 días", k: "xlsx", gen: "plan90" }] }),
        R("Errores comunes al implementar Lean", 5, [
          "Copiar herramientas sin entender el problema que resuelven. Un kanban mal dimensionado genera más faltantes que el sistema anterior.",
          "Hacerlo como proyecto del área de mejora y no de la operación. Si el supervisor no es dueño del cambio, el cambio dura lo que dura el consultor.",
          "Medir actividad en lugar de resultados: cantidad de talleres, de tarjetas o de carteles no dicen nada sobre el lead time o los defectos.",
          "Olvidarse de las personas. Lean se sostiene cuando la gente ve que sus ideas se implementan y que la mejora no se usa para recortar puestos.",
        ]),
        V("Sostener la mejora", 8, "wave", "Rutinas de liderazgo para que lo logrado no se pierda a los seis meses.", { pts: ["Recorridas al lugar de trabajo", "Auditorías breves y frecuentes", "Celebrar y comunicar los resultados"] }),
      ] },
    ],
    exam: { pass: 70, minutes: 15, attempts: 3, qs: [
      q("¿Cuál es el foco principal de Lean?", ["Reducir personal", "Maximizar el valor para el cliente eliminando desperdicios", "Automatizar todos los procesos", "Aumentar el inventario de seguridad"], 1, "Lean busca entregar más valor con menos recursos, eliminando lo que el cliente no paga."),
      q("Un operario camina 40 metros varias veces por turno para buscar herramientas. ¿Qué desperdicio es?", ["Transporte", "Movimiento", "Sobreproducción", "Defectos"], 1, "El desplazamiento innecesario de personas es movimiento; el transporte se refiere a mover materiales."),
      q("¿Qué desperdicio suele considerarse el peor porque genera muchos de los otros?", ["Esperas", "Sobreproducción", "Sobreprocesamiento", "Talento no aprovechado"], 1, "Producir de más o antes de tiempo genera inventario, transporte, movimiento y esconde defectos."),
      q("En un mapa de flujo de valor, el lead time es…", ["El tiempo que una persona tarda en hacer su tarea", "El tiempo total desde que entra el pedido hasta que se entrega", "El tiempo de valor agregado", "El tiempo de preparación de máquina"], 1, "El lead time mide el recorrido completo del pedido, incluidas las esperas."),
      q("Un proceso tiene 5 días corridos de lead time (7.200 minutos) y 40 minutos de valor agregado. Su eficiencia es aproximadamente…", ["56 %", "5,6 %", "0,56 %", "0,056 %"], 2, "40 / 7.200 = 0,0056, es decir 0,56 %. Es un valor habitual en procesos que nunca se mapearon."),
      q("Un sistema pull significa que…", ["Se produce según el pronóstico", "Se produce lo que el proceso siguiente consume", "Se empuja la producción para mantener ocupada a la gente", "Se compra todo por adelantado"], 1, "En pull, el consumo real del proceso cliente dispara la producción."),
      q("¿Para qué sirve el trabajo estandarizado?", ["Para que nadie cambie nada nunca", "Para fijar la mejor forma conocida y tener una base sobre la cual mejorar", "Para controlar a los operarios", "Para reemplazar la capacitación"], 1, "Sin estándar no hay mejora: es el punto de partida que se va actualizando."),
      q("¿Qué indica una buena gestión visual?", ["Que cualquiera entienda el estado del proceso en segundos", "Que haya muchos carteles", "Que los datos estén cargados en el sistema", "Que el supervisor reciba un informe semanal"], 0, "La gestión visual hace evidente lo normal y lo anormal, en el lugar y en el momento."),
    ] },
  },
  /* ------------------------------------------------------------------ */
  {
    key: "layout", slug: "layout-de-planta-slp", title: "Distribución de planta con SLP", subtitle: "Diseñá el layout con método, no a ojo",
    cat: "procesos", level: "Avanzado", instructors: ["andriy"], cover: "img/covers/layout.jpg", isNew: true, updated: -5,
    desc: "El método Systematic Layout Planning aplicado paso a paso: de los flujos y las relaciones entre áreas al plano final. Incluye el análisis de un caso real de ampliación de planta.",
    outcomes: ["Relevar flujos, distancias y recorridos del layout actual", "Construir la matriz y el diagrama de relaciones entre áreas", "Calcular requerimientos de espacio", "Generar y evaluar alternativas con criterios ponderados"],
    forWho: "Gerentes de planta, ingenieros de procesos, responsables de proyectos de mudanza o ampliación.",
    req: "Recomendado haber hecho Lean en la práctica.",
    modules: [
      { t: "Diagnóstico del layout actual", lessons: [
        V("Por qué el layout define la productividad", 8, "light", "Cada metro de recorrido innecesario se paga todos los días, durante años."),
        V("Relevamiento de flujos y distancias", 13, "mist", "Cómo medir lo que se mueve, cuánto y entre qué áreas.", { res: [{ n: "Matriz desde-hacia", k: "xlsx", gen: "desdehacia" }] }),
        V("Diagrama de recorrido (espagueti)", 9, "fil", "Dibujar sobre el plano el camino real de materiales y personas."),
      ] },
      { t: "Método SLP", lessons: [
        V("Análisis producto-cantidad", 10, "wave", "Volumen y variedad definen el tipo de distribución: por producto, por proceso o celular."),
        V("Matriz de relaciones", 12, "ink", "Clasificar la cercanía deseada entre áreas con los códigos A, E, I, O, U y X.", { res: [{ n: "Matriz de relaciones SLP", k: "xlsx", gen: "slp" }] }),
        V("Diagrama de relaciones entre áreas", 11, "drops", "Pasar de la matriz a un esquema espacial que respete las relaciones más fuertes."),
        Q("Control del módulo 2", [
          q("En SLP, la relación «A» significa…", ["Absolutamente necesaria", "Aceptable", "Ausente", "Alternativa"], 0, "A = absolutamente necesaria la cercanía."),
          q("El diagrama de relaciones…", ["Representa las áreas y la intensidad de sus vínculos", "Es un organigrama", "Es el plano de arquitectura final", "Es un cronograma"], 0, "Es un esquema espacial previo al plano, guiado por las relaciones."),
          q("El análisis P-Q ordena…", ["Los productos según la cantidad producida", "Los proveedores por precio", "Las personas por antigüedad", "Los pedidos por cliente"], 0, "P-Q = producto-cantidad."),
        ]),
      ] },
      { t: "Del diagrama al plano", lessons: [
        V("Requerimientos de espacio", 9, "rise", "Equipos, operarios, materiales, pasillos y crecimiento previsto."),
        V("Alternativas y evaluación ponderada", 10, "light", "Comparar opciones con criterios explícitos: flujo, seguridad, flexibilidad y costo."),
        R("Caso real: de 760 m² a 1.860 m²", 7, [
          "Una planta que crecía sin orden decidió mudarse de 760 m² a una nave de 1.860 m². El riesgo era repetir los mismos cruces y recorridos, ahora con más metros.",
          "El trabajo empezó por los datos: qué se movía, cuánto y entre qué áreas. Con la matriz desde-hacia y la matriz de relaciones se identificaron las cercanías críticas y las incompatibles (por ejemplo, zonas limpias lejos de procesos con polvo).",
          "Se generaron tres alternativas y se evaluaron con el equipo usando criterios ponderados. La elegida no era la más barata, pero era la que mejor ordenaba el flujo y dejaba espacio para crecer sin volver a mudarse.",
          "La lección: el layout no se resuelve con un plano lindo, se resuelve con flujos medidos y decisiones explícitas.",
        ]),
      ] },
    ],
    exam: { pass: 70, minutes: 12, attempts: 3, qs: [
      q("¿Qué significa SLP?", ["Systematic Layout Planning", "Standard Lean Process", "Strategic Logistics Plan", "Simple Location Plan"], 0, "Es el método de planificación sistemática de la distribución, de Richard Muther."),
      q("La matriz de relaciones clasifica la cercanía entre áreas con…", ["Las letras A, E, I, O, U y X", "Números del 1 al 10", "Alta, media y baja", "Verde, amarillo y rojo"], 0, "A, E, I, O, U, X: de absolutamente necesaria a no deseable."),
      q("Una relación «X» significa…", ["Cercanía absolutamente necesaria", "Cercanía no deseable", "Importante", "Sin importancia"], 1, "X indica que las áreas deben quedar separadas."),
      q("El análisis producto-cantidad ayuda a…", ["Elegir el tipo de distribución según volumen y variedad", "Calcular salarios", "Definir precios", "Elegir proveedores"], 0, "Alto volumen y poca variedad suelen ir a distribución por producto; lo contrario, por proceso."),
      q("¿Qué herramienta muestra el recorrido real de materiales y personas sobre el plano?", ["Diagrama de recorrido (espagueti)", "Organigrama", "Diagrama de Gantt", "Balance general"], 0, "El espagueti hace visibles los cruces y las distancias."),
      q("Al evaluar alternativas de layout conviene…", ["Elegir la más barata", "Compararlas con criterios ponderados (flujo, seguridad, flexibilidad, costo)", "Elegir la que más le guste a la gerencia", "Copiar el layout de otra planta"], 1, "Los criterios ponderados hacen explícita y defendible la decisión."),
    ] },
  },
  /* ------------------------------------------------------------------ */
  {
    key: "logistica", slug: "almacenes-y-logistica-interna", title: "Almacenes y logística interna", subtitle: "Ordená el depósito, acortá recorridos y confiá en tu inventario",
    cat: "procesos", level: "Intermedio", instructors: ["andriy"], cover: "img/covers/logistica.jpg", updated: -40,
    desc: "Cómo convertir el depósito en un proceso que fluye: indicadores, ubicación por rotación, señalización y conteos cíclicos para tener un inventario confiable.",
    outcomes: ["Medir el desempeño del depósito con pocos indicadores", "Ubicar productos según su rotación (ABC y slotting)", "Implementar conteos cíclicos", "Encontrar las causas de las diferencias de inventario"],
    forWho: "Jefes de depósito, responsables de logística y abastecimiento.",
    req: "Ninguno.",
    modules: [
      { t: "El depósito como proceso", lessons: [
        V("Flujos de entrada y salida", 9, "fil", "Recepción, almacenamiento, preparación y despacho como un único flujo."),
        V("Indicadores del depósito", 10, "light", "Precisión de inventario, pedidos perfectos, productividad de preparación y ocupación."),
      ] },
      { t: "Ubicación y slotting", lessons: [
        V("Clasificación ABC", 8, "wave", "Los pocos ítems que concentran la mayor parte del movimiento."),
        V("Slotting por rotación", 11, "drops", "Lo que más se mueve, más cerca y a mejor altura."),
        V("Señalización y direccionamiento", 7, "ink", "Un código de ubicación que cualquiera entienda el primer día."),
      ] },
      { t: "Inventario confiable", lessons: [
        V("Conteo cíclico", 9, "mist", "Contar un poco todos los días en lugar de cerrar el depósito una vez por año."),
        V("Diferencias de inventario y sus causas", 10, "rise", "De corregir el número a corregir el proceso que generó la diferencia."),
      ] },
    ],
    exam: { pass: 70, minutes: 10, attempts: 3, qs: [
      q("En una clasificación ABC, los ítems A son…", ["Los de menor valor", "Los pocos que concentran la mayor parte del movimiento o del valor", "Los obsoletos", "Los que están en la estantería A"], 1, "Principio de Pareto: pocos ítems explican la mayor parte."),
      q("El slotting es…", ["Asignar ubicaciones según rotación y características del producto", "Contar inventario", "Comprar estanterías", "Despachar pedidos"], 0, "Ubicar bien reduce recorridos y errores de preparación."),
      q("Los productos de mayor rotación conviene ubicarlos…", ["En el fondo del depósito", "Cerca de la zona de preparación y a altura cómoda", "En altura", "Mezclados al azar"], 1, "Menos recorrido y menos esfuerzo en lo que más se mueve."),
      q("El conteo cíclico consiste en…", ["Contar todo el inventario una vez por año", "Contar periódicamente una parte del inventario según criterios", "Contar solo lo que falta", "No contar y confiar en el sistema"], 1, "Permite detectar y corregir causas sin frenar la operación."),
      q("Un indicador clave de precisión de inventario es…", ["El % de ítems o ubicaciones donde el físico coincide con el sistema", "La cantidad de empleados", "Los metros cuadrados", "La cantidad de estanterías"], 0, "Mide cuánto podés confiar en lo que dice el sistema."),
    ] },
  },
  /* ------------------------------------------------------------------ */
  {
    key: "5s", slug: "5s-el-orden-que-se-sostiene", title: "5S: el orden que se sostiene", subtitle: "La base de cualquier mejora, bien hecha",
    cat: "mejora", level: "Inicial", instructors: ["andriy"], cover: "img/covers/5s.jpg", updated: -60,
    desc: "Las 5S explicadas para que no sean una jornada de limpieza más: clasificar, ordenar, limpiar e inspeccionar, estandarizar y sostener, con auditorías simples que mantienen el resultado.",
    outcomes: ["Aplicar cada una de las 5S en planta y en oficina", "Usar tarjetas rojas para decidir qué se queda", "Diseñar estándares visuales", "Auditar y sostener el resultado"],
    forWho: "Equipos operativos, supervisores y cualquier área que quiera trabajar más ordenada.",
    req: "Ninguno.",
    modules: [
      { t: "Fundamentos", lessons: [
        V("Por qué 5S es la base de todo", 7, "drops", "Sin orden no hay estándar, y sin estándar no hay mejora."),
        V("Las cinco S en una mirada", 8, "ink", "Seiri, Seiton, Seiso, Seiketsu y Shitsuke, explicadas con ejemplos."),
      ] },
      { t: "Implementación", lessons: [
        V("Seiri: clasificar", 9, "wave", "Separar lo necesario de lo innecesario con tarjetas rojas."),
        V("Seiton: ordenar", 9, "light", "Un lugar para cada cosa, según frecuencia de uso."),
        V("Seiso: limpiar e inspeccionar", 7, "mist", "Limpiar es inspeccionar: la suciedad esconde fallas."),
        V("Seiketsu: estandarizar", 8, "fil", "Fotos, marcas y estándares visuales para que lo logrado no dependa de la memoria."),
        V("Shitsuke: sostener", 8, "rise", "Hábitos, rutinas de liderazgo y reconocimiento."),
      ] },
      { t: "Auditar y sostener", lessons: [
        V("Auditorías 5S", 9, "drops", "Una auditoría corta y frecuente vale más que una grande una vez por año.", { res: [{ n: "Checklist de auditoría 5S", k: "xlsx", gen: "auditoria5s" }] }),
        V("5S en oficinas y espacios digitales", 7, "ink", "Carpetas compartidas, escritorios y bandejas de entrada también se ordenan."),
      ] },
    ],
    exam: { pass: 70, minutes: 10, attempts: 3, qs: [
      q("¿Qué busca Seiri (clasificar)?", ["Separar lo necesario de lo innecesario y retirar lo que no se usa", "Limpiar a fondo", "Pintar el piso", "Hacer auditorías"], 0, "Es el primer paso: sacar lo que sobra."),
      q("«Un lugar para cada cosa y cada cosa en su lugar» corresponde a…", ["Seiton (ordenar)", "Seiso", "Seiketsu", "Shitsuke"], 0, "Seiton define ubicaciones claras según el uso."),
      q("Seiso no es solo limpiar, también es…", ["Inspeccionar y detectar anomalías", "Tirar todo", "Comprar insumos", "Cambiar el layout"], 0, "Al limpiar se detectan pérdidas, fisuras, desgastes."),
      q("¿Qué S convierte las tres primeras en estándar?", ["Seiketsu", "Seiri", "Seiton", "Shitsuke"], 0, "Seiketsu = estandarizar."),
      q("¿Por qué fracasan muchas implementaciones de 5S?", ["Porque se hacen como jornada de limpieza y no se sostienen con estándares y auditorías", "Porque son caras", "Porque requieren software", "Porque solo sirven en Japón"], 0, "Sin estándar y seguimiento, el orden se pierde en semanas."),
      q("La tarjeta roja se usa para…", ["Marcar elementos dudosos o innecesarios para decidir su destino", "Sancionar a operarios", "Señalizar matafuegos", "Identificar productos defectuosos"], 0, "Es una herramienta de Seiri."),
    ] },
  },
  /* ------------------------------------------------------------------ */
  {
    key: "kaizen", slug: "kaizen-con-tu-equipo", title: "Kaizen con tu equipo", subtitle: "Resolver problemas de raíz, en pequeños pasos",
    cat: "mejora", level: "Intermedio", instructors: ["andriy", "christian"], cover: "img/covers/kaizen.jpg", updated: -22,
    desc: "Procesos y personas en un mismo curso: el método para resolver problemas de raíz (PDCA, 5 porqués, Ishikawa, A3) y la facilitación para que el equipo se apropie de la mejora.",
    outcomes: ["Plantear problemas con datos", "Encontrar causas raíz con 5 porqués e Ishikawa", "Documentar la mejora en un A3", "Preparar y facilitar un evento Kaizen"],
    forWho: "Líderes de equipo, supervisores y facilitadores de mejora continua.",
    req: "Recomendado haber hecho 5S o Lean en la práctica.",
    modules: [
      { t: "Mentalidad Kaizen", lessons: [
        V("Mejora continua: pequeños pasos", 8, "rise", "Muchas mejoras chicas, todos los días, por las personas que hacen el trabajo."),
        V("El ciclo PDCA", 10, "wave", "Planificar, hacer, verificar y actuar: la columna vertebral de toda mejora."),
      ] },
      { t: "Resolver problemas de raíz", lessons: [
        V("Definir bien el problema", 9, "light", "Un problema bien planteado es la mitad de la solución."),
        V("5 porqués e Ishikawa", 12, "ink", "Dos herramientas simples para no quedarse en el síntoma."),
        V("El reporte A3", 11, "fil", "Toda la historia de la mejora en una sola hoja.", { res: [{ n: "Plantilla A3", k: "doc", gen: "a3" }] }),
      ] },
      { t: "El evento Kaizen", lessons: [
        V("Preparar un evento Kaizen", 9, "mist", "Alcance, datos, equipo y logística antes del primer día."),
        V("Facilitar al equipo", 11, "drops", "El rol del facilitador: preguntar, ordenar y sostener la energía del grupo.", { instructor: "christian" }),
        V("Seguimiento de acciones", 7, "rise", "El evento termina; las acciones recién empiezan."),
      ] },
    ],
    exam: { pass: 70, minutes: 12, attempts: 3, qs: [
      q("Kaizen significa…", ["Cambio para mejor, mejora continua", "Calidad total", "Trabajo en equipo", "Reducción de costos"], 0, "Kai = cambio, zen = bueno."),
      q("El ciclo PDCA es…", ["Planificar, Hacer, Verificar, Actuar", "Proponer, Decidir, Controlar, Archivar", "Planear, Delegar, Cobrar, Analizar", "Producir, Distribuir, Comprar, Almacenar"], 0, "Plan-Do-Check-Act."),
      q("Los 5 porqués sirven para…", ["Encontrar la causa raíz de un problema", "Asignar culpables", "Hacer una encuesta", "Priorizar proyectos"], 0, "Preguntar «¿por qué?» sucesivamente hasta llegar a la causa."),
      q("El diagrama de Ishikawa organiza causas en categorías como…", ["Método, mano de obra, máquina, material, medición y medio ambiente", "Ventas, marketing y finanzas", "Norte, sur, este y oeste", "Alta, media y baja"], 0, "Las 6M."),
      q("Un reporte A3 se caracteriza por…", ["Contar en una sola hoja el problema, el análisis, las contramedidas y el seguimiento", "Tener 30 páginas", "Ser solo para la gerencia", "No tener datos"], 0, "Síntesis y lógica en una hoja."),
      q("En un evento Kaizen, el rol del facilitador es…", ["Guiar al equipo para que encuentre y ejecute las mejoras", "Hacer las mejoras solo", "Evaluar a cada participante", "Decidir sin consultar"], 0, "El equipo es dueño de la mejora."),
    ] },
  },
  /* ------------------------------------------------------------------ */
  {
    key: "liderazgo", slug: "liderazgo-aumentado", title: "Liderazgo aumentado", subtitle: "Liderá personas y procesos en tiempos de cambio e inteligencia artificial",
    cat: "liderazgo", level: "Intermedio", instructors: ["christian", "andriy"], cover: "img/covers/liderazgo.jpg", featured: true, updated: -9,
    desc: "Un programa para directivos y mandos medios que necesitan liderar equipos, sostener resultados y aprovechar la inteligencia artificial sin perder lo humano. Combina la mirada de personas y la de procesos.",
    outcomes: ["Pasar de controlar tareas a desarrollar personas", "Dar feedback que se pueda usar", "Sostener reuniones 1 a 1 y acuerdos claros", "Delegar con seguimiento", "Usar la IA como copiloto sin delegar el criterio"],
    forWho: "Directivos, gerentes y mandos medios con equipos a cargo.",
    req: "Tener personas a cargo (o estar por tenerlas).",
    modules: [
      { t: "El líder que hace falta hoy", lessons: [
        V("Del jefe al líder", 10, "mist", "Por qué el control ya no alcanza y qué esperan hoy los equipos de quien los lidera.", { pts: ["Autoridad formal vs. influencia", "Del «qué hacer» al «para qué»", "El líder como desarrollador de personas"] }),
        V("Tu estilo de liderazgo", 9, "drops", "Reconocer tu estilo predominante y cuándo te conviene cambiarlo.", { pts: ["Directivo, persuasivo, participativo, delegativo", "Adaptar el estilo a la madurez de cada persona", "Señales de que tu estilo no funciona"] }),
        Q("Control del módulo 1", [
          q("¿Qué caracteriza a un líder frente a un jefe?", ["Genera compromiso y desarrolla a su equipo", "Tiene un cargo más alto", "Trabaja más horas", "Toma todas las decisiones solo"], 0, "El liderazgo se apoya en la influencia, no solo en la autoridad."),
          q("Con una persona nueva y sin experiencia en la tarea conviene un estilo…", ["Más directivo, con instrucciones claras y seguimiento cercano", "Totalmente delegativo", "Ausente", "Siempre el mismo para todos"], 0, "El estilo se adapta a la madurez de la persona en esa tarea."),
          q("Una señal de que tu estilo no está funcionando es…", ["Que todas las decisiones y consultas pasen por vos", "Que el equipo proponga mejoras", "Que se cumplan los acuerdos", "Que la gente pida feedback"], 0, "Si todo pasa por el líder, el equipo no está creciendo."),
        ]),
      ] },
      { t: "Conversaciones que mueven", lessons: [
        V("Escucha activa", 8, "ink", "Escuchar para entender, no para responder.", { pts: ["Parafrasear", "Preguntar antes de opinar", "Registrar emociones, no solo datos"] }),
        V("Feedback que se puede usar", 12, "wave", "Un modelo simple para conversaciones sobre desempeño: situación, conducta, impacto y acuerdo.", { res: [{ n: "Guía de conversación de feedback", k: "doc", gen: "feedback" }] }),
        V("Reuniones 1 a 1", 9, "light", "El espacio más rentable del calendario de un líder.", { res: [{ n: "Guía de reunión 1 a 1", k: "doc", gen: "unoauno" }] }),
      ] },
      { t: "Liderar equipos y procesos", lessons: [
        V("Objetivos claros y acuerdos", 10, "rise", "De las expectativas implícitas a los acuerdos explícitos."),
        V("Delegar sin desentenderse", 9, "fil", "Resultado esperado, nivel de autonomía, recursos y momentos de control."),
        V("Liderar con indicadores", 11, "drops", "Pocos números, a la vista, revisados con el equipo.", { instructor: "andriy" }),
      ] },
      { t: "Liderazgo aumentado con IA", lessons: [
        V("La IA como copiloto del líder", 12, "ink", "Preparar reuniones, sintetizar información y redactar mejor, sin delegar el criterio.", { instructor: "andriy" }),
        V("Decisiones con criterio humano", 8, "mist", "Lo que la IA no puede hacer por vos: contexto, ética y vínculo."),
        R("Tu plan de desarrollo", 6, [
          "Cerrá el programa con un plan concreto. Elegí dos conductas de liderazgo que quieras fortalecer en los próximos 90 días: por ejemplo, sostener reuniones 1 a 1 quincenales o dar feedback dentro de las 48 horas.",
          "Para cada conducta definí: qué vas a hacer distinto, con quién, cómo vas a saber que lo estás logrando y quién te va a dar una devolución honesta.",
          "Sumá un uso concreto de inteligencia artificial que te ahorre tiempo (preparar la agenda de tus reuniones, resumir informes) y medí cuánto tiempo recuperás por semana.",
          "Agendá hoy la primera revisión, dentro de 30 días. Un plan sin fecha de revisión es solo una buena intención.",
        ]),
      ] },
    ],
    exam: { pass: 70, minutes: 15, attempts: 3, qs: [
      q("La principal diferencia entre jefe y líder es que el líder…", ["Genera compromiso y desarrolla a su equipo, no solo controla tareas", "Tiene un cargo más alto", "Trabaja más horas", "No tiene que rendir cuentas"], 0, "El liderazgo se mide por lo que el equipo logra y aprende."),
      q("La escucha activa implica…", ["Escuchar para entender, parafrasear y preguntar antes de responder", "Esperar el turno para hablar", "Dar consejos rápido", "Anotar todo sin mirar a la persona"], 0, "Escuchar para comprender, no para contestar."),
      q("Un feedback útil es…", ["Específico, sobre conductas observables y orientado a mejorar", "General y sobre la personalidad", "Solo negativo", "Solo una vez al año"], 0, "Conducta concreta + impacto + acuerdo."),
      q("La reunión 1 a 1 es principalmente…", ["Un espacio del colaborador para hablar de su trabajo, sus bloqueos y su desarrollo", "Un control de tareas", "Una evaluación de desempeño", "Una reunión de equipo"], 0, "La agenda es, sobre todo, del colaborador."),
      q("Delegar bien implica…", ["Acordar resultado, autonomía, recursos y momentos de seguimiento", "Pasar la tarea y desentenderse", "Hacerlo uno mismo para que salga bien", "Delegar solo lo que nadie quiere hacer"], 0, "Delegar no es abandonar."),
      q("Un objetivo bien planteado es…", ["Específico, medible, alcanzable, relevante y con plazo", "Lo más ambicioso posible y sin plazo", "Definido solo por el líder sin conversarlo", "Confidencial"], 0, "Criterio SMART."),
      q("Usar la IA como copiloto del líder significa…", ["Apoyarse en ella para preparar, analizar y redactar, manteniendo el criterio y la decisión humana", "Que la IA decida por el equipo", "Reemplazar las conversaciones con el equipo", "No revisar lo que produce"], 0, "La IA amplía, el líder decide."),
      q("Un plan de desarrollo personal debería incluir…", ["Objetivos de crecimiento, acciones concretas, apoyos y fechas de revisión", "Solo cursos a realizar", "Una lista de defectos", "Nada por escrito"], 0, "Sin fecha de revisión, el plan no se cumple."),
    ] },
  },
  /* ------------------------------------------------------------------ */
  {
    key: "coaching", slug: "conversaciones-de-coaching", title: "Conversaciones de coaching", subtitle: "Preguntas que hacen pensar y compromisos que se cumplen",
    cat: "liderazgo", level: "Intermedio", instructors: ["christian"], cover: "img/covers/equipos.jpg", updated: -30,
    desc: "Herramientas de coaching para líderes: preguntas poderosas, el modelo GROW y cómo encarar conversaciones difíciles sin romper el vínculo.",
    outcomes: ["Usar preguntas abiertas y poderosas", "Conducir una conversación con el modelo GROW", "Prepararte para conversaciones difíciles", "Cerrar con compromisos y seguimiento"],
    forWho: "Líderes, mandos medios y profesionales de recursos humanos.",
    req: "Ninguno.",
    modules: [
      { t: "Bases del coaching", lessons: [
        V("Qué es (y qué no es) coaching", 8, "mist", "No es terapia, ni consejo, ni capacitación: es acompañar a otro a pensar mejor."),
        V("El líder como coach", 9, "drops", "Cuándo dar la respuesta y cuándo hacer la pregunta."),
      ] },
      { t: "Herramientas", lessons: [
        V("Preguntas poderosas", 10, "wave", "Abiertas, breves y orientadas al futuro."),
        V("El modelo GROW", 12, "light", "Objetivo, realidad, opciones y voluntad: una conversación con estructura."),
        V("Compromisos y seguimiento", 7, "rise", "Sin un próximo paso concreto, la conversación fue solo una charla."),
      ] },
      { t: "Conversaciones difíciles", lessons: [
        V("Prepararse", 8, "ink", "Objetivo, hechos y la primera frase."),
        V("Manejar las emociones", 10, "fil", "Las propias y las del otro."),
        V("Cerrar con acuerdos", 7, "drops", "Qué, quién, cuándo y cómo vamos a revisar."),
      ] },
    ],
    exam: { pass: 70, minutes: 10, attempts: 3, qs: [
      q("El coaching se basa principalmente en…", ["Preguntas que ayudan a la persona a encontrar sus propias respuestas", "Dar instrucciones", "Contar la propia experiencia", "Corregir errores"], 0, "La respuesta la construye el otro."),
      q("GROW significa…", ["Goal, Reality, Options, Will (objetivo, realidad, opciones, compromiso)", "Grow, Run, Open, Win", "Grupo, Rol, Objetivo, Resultado", "Ganar, Retener, Ordenar, Vender"], 0, "Estructura de cuatro pasos para una conversación de coaching."),
      q("Una pregunta poderosa suele ser…", ["Abierta, breve y orientada a la reflexión", "Cerrada, de sí o no", "Larga y con varias preguntas juntas", "Una sugerencia disfrazada"], 0, "«¿Qué harías si…?» abre más que «¿no te parece que…?»."),
      q("Antes de una conversación difícil conviene…", ["Definir el objetivo, los hechos y cómo abrir la conversación", "Improvisar", "Juntar quejas de otros", "Hacerla por chat"], 0, "La preparación baja la carga emocional."),
      q("Una conversación de coaching termina bien cuando…", ["Hay compromisos concretos y una fecha de seguimiento", "El líder tuvo razón", "Nadie se enojó", "Duró más de una hora"], 0, "El cierre es acción + seguimiento."),
    ] },
  },
  /* ------------------------------------------------------------------ */
  {
    key: "equipos", slug: "equipos-que-se-hacen-cargo", title: "Equipos que se hacen cargo", subtitle: "Confianza, acuerdos y rituales para rendir de forma sostenida",
    cat: "equipos", level: "Inicial", instructors: ["christian"], cover: null, isNew: true, updated: -3,
    desc: "Qué diferencia a un grupo de personas de un equipo que se hace cargo de sus resultados, y cómo construirlo con acuerdos, roles claros y rituales simples.",
    outcomes: ["Distinguir grupo de equipo", "Promover seguridad psicológica", "Definir roles y acuerdos de funcionamiento", "Instalar rituales de equipo y reconocimiento"],
    forWho: "Líderes de equipo y equipos completos.",
    req: "Ninguno.",
    modules: [
      { t: "Qué hace a un buen equipo", lessons: [
        V("Grupo o equipo", 7, "drops", "Objetivo común y responsabilidad compartida."),
        V("Confianza y seguridad psicológica", 11, "mist", "Poder preguntar, opinar o equivocarse sin miedo."),
      ] },
      { t: "Acuerdos y roles", lessons: [
        V("Roles claros", 8, "light", "Quién decide, quién hace, a quién se consulta."),
        V("Acuerdos de funcionamiento", 9, "wave", "Cómo nos comunicamos, cómo decidimos, cómo resolvemos conflictos."),
      ] },
      { t: "Rendimiento sostenido", lessons: [
        V("Rituales de equipo", 8, "rise", "Reunión diaria, revisión semanal y retrospectiva."),
        V("Reconocimiento", 6, "ink", "Oportuno, específico y sincero."),
      ] },
    ],
    exam: { pass: 70, minutes: 10, attempts: 3, qs: [
      q("La diferencia entre un grupo y un equipo es que el equipo…", ["Comparte un objetivo común y responsabilidad mutua por el resultado", "Es más grande", "Tiene jefe", "Trabaja más horas"], 0, "Objetivo común + responsabilidad compartida."),
      q("La seguridad psicológica es…", ["La confianza de poder opinar, preguntar o equivocarse sin ser castigado", "Un seguro de trabajo", "La ausencia de conflictos", "Que nadie critique nada"], 0, "No es ausencia de conflicto, es poder hablar."),
      q("Los acuerdos de funcionamiento sirven para…", ["Explicitar cómo vamos a trabajar juntos", "Reemplazar el contrato laboral", "Definir sueldos", "Controlar horarios"], 0, "Hacen visibles las reglas implícitas."),
      q("Un ritual de equipo efectivo es, por ejemplo…", ["Una reunión diaria corta para coordinar prioridades y bloqueos", "Una reunión semanal de 3 horas sin agenda", "Un correo anual con novedades", "Un grupo de chat sin reglas"], 0, "Breve, frecuente y con foco."),
      q("El reconocimiento funciona mejor cuando es…", ["Oportuno, específico y sincero", "Genérico y masivo", "Solo económico", "Una vez al año"], 0, "Cerca del hecho y concreto."),
    ] },
  },
  /* ------------------------------------------------------------------ */
  {
    key: "cx", slug: "experiencia-del-cliente", title: "Experiencia del cliente que fideliza", subtitle: "Entrenamiento comercial y cultura de servicio",
    cat: "equipos", level: "Intermedio", instructors: ["christian"], cover: null, updated: -45,
    desc: "Cómo diseñar cada contacto con el cliente para que vuelva y te recomiende: momentos de verdad, venta consultiva, manejo de objeciones y estándares de servicio medibles.",
    outcomes: ["Mapear la experiencia del cliente", "Diagnosticar necesidades con preguntas", "Responder objeciones con valor", "Definir y medir estándares de servicio"],
    forWho: "Equipos comerciales, de atención al cliente y sus líderes.",
    req: "Ninguno.",
    modules: [
      { t: "Pensar desde el cliente", lessons: [
        V("Momentos de verdad", 8, "light", "Cada contacto suma o resta."),
        V("Mapa de experiencia del cliente", 11, "wave", "El recorrido completo, con sus dolores y oportunidades."),
      ] },
      { t: "Entrenamiento comercial", lessons: [
        V("Escuchar y diagnosticar", 9, "mist", "Preguntar antes de ofrecer."),
        V("La propuesta de valor en una conversación", 10, "drops", "Conectar lo que ofrecés con lo que el cliente necesita."),
        V("Manejo de objeciones", 10, "ink", "Una objeción es una pregunta sin responder."),
      ] },
      { t: "Cultura de servicio", lessons: [
        V("Estándares de servicio", 8, "rise", "Lo que todos hacen, siempre, con cada cliente."),
        V("Medir la experiencia", 7, "fil", "NPS, satisfacción y esfuerzo del cliente."),
      ] },
    ],
    exam: { pass: 70, minutes: 10, attempts: 3, qs: [
      q("Un «momento de verdad» es…", ["Cualquier contacto en el que el cliente se forma una opinión sobre la empresa", "El momento de pagar", "Una auditoría", "El cierre contable"], 0, "Cada interacción cuenta."),
      q("El mapa de experiencia del cliente sirve para…", ["Ver el recorrido completo y detectar dolores y oportunidades", "Ubicar sucursales", "Calcular precios", "Organizar el depósito"], 0, "Se diseña desde los ojos del cliente."),
      q("En una venta consultiva, lo primero es…", ["Diagnosticar la necesidad del cliente con preguntas", "Presentar todo el catálogo", "Hablar del precio", "Ofrecer un descuento"], 0, "Sin diagnóstico no hay propuesta relevante."),
      q("Ante una objeción conviene…", ["Escuchar, entender la preocupación real y responder con valor", "Discutir", "Ignorarla", "Bajar el precio enseguida"], 0, "Primero entender, después responder."),
      q("El NPS mide…", ["La probabilidad de que el cliente recomiende la empresa", "La cantidad de ventas", "El tiempo de atención", "El margen"], 0, "Net Promoter Score."),
    ] },
  },
  /* ------------------------------------------------------------------ */
  {
    key: "ia", slug: "ia-aplicada-a-la-gestion", title: "Inteligencia artificial aplicada a la gestión", subtitle: "Usá la IA para trabajar mejor, con criterio y sin riesgos",
    cat: "ia", level: "Inicial", instructors: ["andriy"], cover: "img/covers/ia.jpg", isNew: true, featured: true, updated: -2,
    desc: "Qué puede y qué no puede hacer hoy la inteligencia artificial generativa en una empresa, cómo pedirle bien las cosas y cómo llevarla a tu área con un piloto medible y una política de uso responsable.",
    outcomes: ["Entender cómo funciona la IA generativa y sus límites", "Escribir pedidos (prompts) claros y efectivos", "Aplicarla a resumir, redactar, analizar y automatizar", "Diseñar un piloto de 30 días con resultados medibles"],
    forWho: "Cualquier persona de la empresa, sin conocimientos técnicos.",
    req: "Ninguno.",
    modules: [
      { t: "Entender la IA generativa", lessons: [
        V("Qué es y qué no es", 9, "fil", "Modelos que generan contenido a partir de patrones: potentes, pero no infalibles."),
        V("Límites y riesgos", 8, "mist", "Alucinaciones, sesgos y datos confidenciales."),
      ] },
      { t: "Trabajar con IA", lessons: [
        V("Escribir buenos pedidos", 12, "light", "Contexto, tarea, formato y criterios.", { res: [{ n: "Biblioteca de pedidos para gestión", k: "doc", gen: "prompts" }] }),
        V("Resumir, redactar y analizar", 10, "wave", "Los tres usos que más tiempo ahorran."),
        V("Automatizar tareas repetitivas", 11, "drops", "Del pedido suelto al flujo de trabajo."),
      ] },
      { t: "Llevarla a la empresa", lessons: [
        V("Casos de uso por área", 10, "ink", "Operaciones, comercial, administración y recursos humanos."),
        R("Política de uso responsable", 5, [
          "Antes de que cada persona use la herramienta que encontró, conviene acordar reglas simples. La primera: no cargar datos personales ni información confidencial de la empresa o de clientes en herramientas que no estén aprobadas.",
          "La segunda: todo lo que produce la IA se revisa. La responsabilidad sobre un correo, un informe o una decisión sigue siendo de la persona que lo firma.",
          "La tercera: transparencia. Si un documento se armó con ayuda de IA y eso es relevante para quien lo recibe, se dice.",
          "Una política de una página, conocida por todos, vale más que un reglamento largo que nadie lee.",
        ]),
        V("Plan piloto de 30 días", 9, "rise", "Elegir una tarea, medir la línea de base y decidir con datos."),
      ] },
    ],
    exam: { pass: 70, minutes: 12, attempts: 3, qs: [
      q("La IA generativa…", ["Produce texto, imágenes u otros contenidos a partir de patrones aprendidos de datos", "Siempre dice la verdad", "Piensa como una persona", "Solo sirve para programar"], 0, "Genera contenido plausible, que hay que verificar."),
      q("Una «alucinación» de la IA es…", ["Una respuesta que suena convincente pero es falsa o inventada", "Un error de conexión", "Una imagen borrosa", "Un virus"], 0, "Por eso todo lo generado se revisa."),
      q("Un buen pedido (prompt) incluye…", ["Contexto, tarea concreta, formato esperado y criterios", "Una sola palabra", "Datos confidenciales de clientes", "Nada en particular"], 0, "Cuanto más claro el pedido, mejor la respuesta."),
      q("¿Qué NO deberías cargar en una herramienta de IA pública sin autorización?", ["Datos personales o confidenciales de la empresa y de clientes", "Un texto propio para corregir la ortografía", "Una pregunta general", "Un borrador de correo sin datos sensibles"], 0, "Proteger la información es la primera regla."),
      q("Un buen primer caso de uso de IA en una empresa es…", ["Una tarea repetitiva, frecuente y fácil de verificar", "Una decisión crítica sin supervisión", "Reemplazar a un área completa", "Algo que nadie entiende"], 0, "Bajo riesgo, alto volumen, fácil de medir."),
      q("Un piloto de IA de 30 días debería terminar con…", ["Resultados medidos contra la situación inicial y la decisión de escalar o no", "La compra de licencias para todos", "Un informe sin datos", "Nada concreto"], 0, "Medir antes y después."),
    ] },
  },
  /* ------------------------------------------------------------------ */
  {
    key: "kpi", slug: "indicadores-y-tableros", title: "Indicadores y tableros para decidir", subtitle: "Medí lo que importa y convertí datos en decisiones",
    cat: "datos", level: "Intermedio", instructors: ["andriy"], cover: "img/covers/indicadores.jpg", updated: -18,
    desc: "De los objetivos a los indicadores, de los indicadores a un tablero que se lee en segundos, y del tablero a reuniones de seguimiento que terminan en acciones.",
    outcomes: ["Definir indicadores ligados a objetivos y decisiones", "Completar la ficha técnica de cada KPI", "Diseñar tableros claros", "Distinguir señal de ruido y conducir reuniones de seguimiento"],
    forWho: "Mandos medios, analistas y responsables de área.",
    req: "Manejo básico de planillas de cálculo.",
    modules: [
      { t: "Medir lo que importa", lessons: [
        V("De objetivos a indicadores", 9, "light", "Cada indicador responde a una pregunta y alimenta una decisión."),
        V("La ficha técnica de un KPI", 10, "ink", "Definición, fórmula, fuente, frecuencia, responsable y meta.", { res: [{ n: "Ficha técnica de indicador", k: "xlsx", gen: "kpi" }] }),
      ] },
      { t: "Tableros", lessons: [
        V("Un tablero que se lee en 10 segundos", 12, "wave", "Pocos indicadores, con meta, tendencia y semáforo claro."),
        V("Tableros de piso y de gestión", 9, "fil", "Cada nivel mira lo que puede cambiar."),
      ] },
      { t: "Decidir con datos", lessons: [
        V("Variación: señal o ruido", 11, "mist", "No reaccionar a cada subida o bajada."),
        V("Reuniones de seguimiento con datos", 8, "drops", "Indicador, desvío, causa, acción, responsable."),
      ] },
    ],
    exam: { pass: 70, minutes: 12, attempts: 3, qs: [
      q("Un buen indicador debe estar ligado a…", ["Un objetivo y a una decisión que se va a tomar con él", "Lo que es fácil de medir", "Lo que mide la competencia", "Nada en particular"], 0, "Si no cambia ninguna decisión, sobra."),
      q("La ficha técnica de un KPI incluye…", ["Definición, fórmula, fuente, frecuencia, responsable y meta", "Solo el nombre", "Solo el gráfico", "El color del tablero"], 0, "Evita que cada uno lo calcule distinto."),
      q("Un tablero bien diseñado…", ["Se entiende en segundos y muestra pocos indicadores clave con su meta", "Tiene todos los datos posibles", "Usa gráficos 3D", "No muestra metas"], 0, "Menos es más."),
      q("Indicador de resultado vs. de proceso:", ["El de resultado mide lo logrado; el de proceso, lo que lo genera y permite anticiparse", "Son lo mismo", "El de proceso siempre es financiero", "El de resultado siempre es diario"], 0, "Los de proceso son los que se pueden gestionar día a día."),
      q("Ante una variación en un indicador conviene…", ["Distinguir si es variación normal o una señal real antes de reaccionar", "Reaccionar siempre", "Ignorarlas todas", "Cambiar la meta"], 0, "Reaccionar al ruido empeora el proceso."),
      q("Una reunión de seguimiento efectiva…", ["Revisa indicadores contra meta, analiza desvíos y define acciones con responsables", "Lee todos los datos en voz alta", "No tiene agenda", "Busca culpables"], 0, "Termina en acciones, no en explicaciones."),
    ] },
  },
  /* ------------------------------------------------------------------ */
  {
    key: "sixsigma", slug: "six-sigma-yellow-belt", title: "Six Sigma Yellow Belt", subtitle: "Reducí la variación con el método DMAIC",
    cat: "datos", level: "Intermedio", instructors: ["andriy"], cover: "img/covers/control.jpg", soon: true, updated: -1,
    desc: "Introducción al método DMAIC (definir, medir, analizar, mejorar y controlar) para participar en proyectos de mejora que reducen defectos y variación.",
    outcomes: ["Entender la lógica DMAIC", "Medir la capacidad de un proceso", "Analizar causas con datos", "Controlar los resultados en el tiempo"],
    forWho: "Analistas, supervisores y profesionales de calidad.",
    req: "Recomendado: Indicadores y tableros para decidir.",
    modules: [
      { t: "Definir y medir", lessons: [V("El método DMAIC", 10, "light", "Cinco fases para resolver problemas complejos con datos."), V("Medir la capacidad del proceso", 12, "wave", "Qué tan bien cumple tu proceso lo que el cliente pide.")] },
      { t: "Analizar, mejorar y controlar", lessons: [V("Analizar causas con datos", 12, "ink", "Del gráfico a la causa."), V("Mejorar y controlar", 10, "rise", "Implementar y sostener con gráficos de control.")] },
    ],
    exam: null,
  },
];

export const PATHS = [
  { id: "p-lider", title: "Líder aumentado", desc: "Para quienes lideran personas: conversaciones, equipos y el uso de la IA como copiloto.", courses: ["liderazgo", "coaching", "equipos", "ia"] },
  { id: "p-lean", title: "Operaciones Lean", desc: "De ver el desperdicio a sostener la mejora con datos: el camino completo de procesos.", courses: ["5s", "lean", "kaizen", "kpi"] },
  { id: "p-datos", title: "Gestión con datos e IA", desc: "Medir lo que importa, decidir mejor y apoyarte en la inteligencia artificial.", courses: ["kpi", "ia", "sixsigma"] },
];

/* Clases en vivo (sincrónicas). `d` = días desde hoy, `h` = hora local */
/* kind: "youtube" = transmisión (YouTube Live), "meet" | "zoom" | "teams" = reunión interactiva */
export const LIVE = [
  { t: "Lanzamiento del campus: cómo aprovecharlo", d: -7, h: "18:00", min: 45, by: ["andriy", "christian"], course: null, kind: "youtube", rec: true, desc: "Recorrido por el campus: cómo elegir cursos, seguir tu avance, rendir exámenes y obtener certificados." },
  { t: "Clínica de implementación Lean: preguntas abiertas", d: 2, h: "18:00", min: 60, by: ["andriy"], course: "lean", kind: "youtube", desc: "Traé tus dudas de implementación: desperdicios, mapas de flujo y planes de 90 días. Respondemos en vivo las preguntas más votadas." },
  { t: "Mentoría grupal: conversaciones difíciles", d: 6, h: "19:00", min: 75, by: ["christian"], course: "coaching", kind: "meet", desc: "Encuentro reducido y participativo para practicar conversaciones difíciles con casos reales de los participantes." },
  { t: "Taller en vivo: tu primer tablero de indicadores", d: 13, h: "18:30", min: 90, by: ["andriy"], course: "kpi", kind: "youtube", desc: "Armamos paso a paso un tablero de indicadores con una planilla de ejemplo." },
  { t: "Kaizen exprés: un problema real en 90 minutos", d: 20, h: "18:00", min: 90, by: ["andriy", "christian"], course: "kaizen", kind: "zoom", desc: "Un equipo voluntario trae un problema real y lo trabajamos en vivo con el método A3." },
];

export const COMPANIES = ["Logística Austral", "Clínica Los Álamos", "Metalúrgica del Valle"];

/* Alumnos ficticios para que los reportes del panel tengan datos */
export const STUDENTS = [
  ["Lucas Fernández", 0], ["Sofía Romero", 1], ["Julián Acosta", 2], ["Valentina Ríos", 0], ["Tomás Benítez", 2],
  ["Camila Herrera", 1], ["Nicolás Medina", 0], ["Florencia Giménez", 1], ["Matías Castro", 2], ["Agustina Molina", 0],
  ["Federico Ruiz", 2], ["Carolina Ortiz", 1], ["Diego Peralta", 0], ["Paula Domínguez", 1],
];

/* Preguntas y opiniones de ejemplo */
export const THREADS = [
  { course: "lean", lesson: [1, 0], by: 3, d: -6, text: "¿El VSM se puede aplicar a un proceso administrativo, como la aprobación de compras?", reply: { by: "andriy", d: -5, text: "Sí, funciona igual: cada paso es una tarea, los inventarios son las solicitudes esperando y la línea de tiempo muestra dónde se frena. En oficinas suele haber todavía más espera que en planta." } },
  { course: "lean", lesson: [0, 2], by: 6, d: -12, text: "En nuestro depósito el mayor desperdicio parece ser la espera de los camiones. ¿Por dónde conviene empezar?", reply: { by: "andriy", d: -11, text: "Empezá midiendo: hora de llegada, hora de inicio de descarga y de salida, durante dos semanas. Con eso vas a ver si el problema es de agenda, de personal o de espacio." } },
  { course: "ia", lesson: [1, 0], by: 11, d: -1, text: "¿Qué herramienta de IA conviene para empezar en una pyme sin presupuesto para licencias?" },
  { course: "5s", lesson: [2, 0], by: 7, d: -2, text: "¿Cada cuánto conviene hacer la auditoría 5S en un depósito chico?" },
  { course: "liderazgo", lesson: [1, 1], by: 1, d: -4, text: "¿Cómo doy feedback a alguien con más antigüedad que yo en la empresa?", reply: { by: "christian", d: -3, text: "Con el mismo modelo, pero empezando por pedir permiso y reconociendo su experiencia: «Quiero compartirte algo que vi, ¿te parece?». Hablá de la conducta y del impacto, no de la persona." } },
];

export const REVIEWS = [
  { course: "lean", by: 0, stars: 5, d: -20, text: "Muy práctico. El ejemplo del recorrido de un pedido lo apliqué esa misma semana." },
  { course: "lean", by: 4, stars: 5, d: -15, text: "Claro y al grano. La plantilla del VSM nos sirvió para el primer mapa." },
  { course: "lean", by: 9, stars: 4, d: -9, text: "Excelente contenido. Me hubiera gustado un ejemplo más de servicios." },
  { course: "5s", by: 2, stars: 5, d: -30, text: "Lo hicimos con todo el equipo de planta y armamos la primera auditoría." },
  { course: "5s", by: 7, stars: 4, d: -25, text: "Muy bueno el módulo de oficinas." },
  { course: "liderazgo", by: 1, stars: 5, d: -6, text: "Las guías de 1 a 1 y de feedback valen el curso entero." },
  { course: "liderazgo", by: 5, stars: 5, d: -8, text: "Combina muy bien lo humano con lo práctico." },
  { course: "kaizen", by: 8, stars: 5, d: -14, text: "El A3 nos ordenó las reuniones de mejora." },
  { course: "ia", by: 11, stars: 5, d: -1, text: "Ideal para empezar sin miedo y con reglas claras." },
  { course: "kpi", by: 12, stars: 4, d: -10, text: "Muy útil la ficha técnica de indicadores." },
];
