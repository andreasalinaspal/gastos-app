// Micro-lecciones de educación crediticia (Fase 2.2) — data pura, sin lógica.
// Cada lección: 3-5 slides cortos + quiz de 1 pregunta con explicación que enseña.
// Tono: cercano, español peruano, sin jerga financiera.

export const LESSONS = [
  {
    id: "historial",
    emoji: "🪪",
    title: "Qué es el historial crediticio y quién lo ve",
    slides: [
      "Tu historial crediticio es como tu 'currículum de pagos'. Registra qué créditos has tenido y si pagaste a tiempo o no. Es la carta de presentación de tu plata.",
      "En el Perú lo registran las centrales de riesgo: Infocorp (Equifax) y Experian. Cada vez que pagas —o dejas de pagar— un crédito, queda anotado ahí.",
      "¿Quién lo mira? Bancos y financieras antes de darte una tarjeta o un préstamo. Y ojo: hasta algunos empleadores lo revisan para ciertos puestos.",
      "Lo bueno: se construye con CUALQUIER crédito. Tu celular postpago, una tarjeta, un préstamo chiquito. No necesitas deberle plata a un banco grande para empezar.",
      "Si nunca has tenido un crédito, para el sistema eres 'invisible'. No es malo, pero tampoco bueno: no hay evidencia de que pagas bien. Por eso empezar con algo pequeño ayuda.",
    ],
    quiz: {
      question: "¿Con cuál de estas cosas puedes empezar a construir historial crediticio?",
      options: [
        "Solo con una tarjeta de crédito de un banco grande",
        "Con cualquier crédito: hasta un celular postpago cuenta",
        "Pagando puntual el recibo de luz con efectivo",
      ],
      correctIndex: 1,
      explanation: "Cualquier crédito formal construye historial: un postpago, una tarjeta, un préstamo pequeño. El recibo de luz pagado en efectivo no cuenta porque no es un crédito — nadie te está prestando plata.",
    },
  },
  {
    id: "corte-vs-pago",
    emoji: "📅",
    title: "Corte vs. fecha de pago",
    slides: [
      "Tu tarjeta tiene dos fechas clave y mucha gente las confunde. La fecha de CORTE es cuando el banco 'cierra la foto' de tus consumos del mes y arma tu estado de cuenta.",
      "La fecha de PAGO es el día límite para pagar esa foto. Suele caer unos 15-20 días después del corte. Ese tiempo entre corte y pago es tu periodo de gracia: días extra sin intereses.",
      "El error común: pensar que el corte es la fecha límite para pagar. No lo es. El corte solo define QUÉ entra en tu cuenta del mes. Lo que importa pagar puntual es la fecha de pago.",
      "El truco de los que dominan su tarjeta: comprar justo DESPUÉS del corte. Ese consumo entra recién en la foto del siguiente mes, así que tienes casi 2 meses para pagarlo sin un sol de intereses.",
    ],
    quiz: {
      question: "Tu corte es el 25 y tu fecha de pago el 15. ¿Cuándo te conviene hacer una compra grande para tener más tiempo de pagarla sin intereses?",
      options: [
        "El 24, justo antes del corte",
        "El 26, justo después del corte",
        "Da igual, el plazo siempre es el mismo",
      ],
      correctIndex: 1,
      explanation: "Comprando el 26, tu consumo entra recién en el estado de cuenta del siguiente mes, y lo pagas hasta el 15 del mes que sigue: casi 2 meses gratis. Si compras el 24, entra en la foto de ese mismo corte y tienes solo unos 20 días.",
    },
  },
  {
    id: "pago-minimo",
    emoji: "💸",
    title: "Pago mínimo vs. pago total: el costo real",
    slides: [
      "El 'pago mínimo' de tu estado de cuenta parece un salvavidas, pero es una trampa cara. Es apenas lo justo para que el banco no te reporte como moroso — casi todo se va en intereses.",
      "Números reales: debes S/ 1,000 en una tarjeta peruana típica con TEA cercana al 100%. Si pagas solo el mínimo cada mes, gran parte de tu pago se va en intereses y la deuda casi no baja.",
      "A ese ritmo puedes pasar años pagando y terminar devolviendo el doble o más de lo que gastaste. Ese menú de S/ 15 te puede salir S/ 30 sin que te des cuenta.",
      "La regla de oro: paga el TOTAL de tu ciclo antes de la fecha de pago. Si pagas todo, el banco no te cobra ni un sol de intereses. Cero. La tarjeta sale gratis.",
      "Si un mes no puedes pagar todo, paga lo máximo que puedas — cada sol por encima del mínimo sí baja la deuda de verdad. El mínimo es el último recurso, no la costumbre.",
    ],
    quiz: {
      question: "Debes S/ 1,000 en tu tarjeta. ¿Qué pasa si cada mes pagas solo el mínimo?",
      options: [
        "La deuda baja poco a poco y en unos meses la terminas",
        "La deuda casi no baja: la mayor parte de tu pago se va en intereses",
        "El banco te congela los intereses por pagar puntual",
      ],
      correctIndex: 1,
      explanation: "Con una TEA cercana al 100% (típica en tarjetas peruanas), el pago mínimo apenas cubre los intereses del mes. La deuda casi no se mueve y puedes terminar pagando el doble. Pagar el total del ciclo, en cambio, siempre es cero intereses.",
    },
  },
  {
    id: "regla-30",
    emoji: "📊",
    title: "La regla del 30% de la línea",
    slides: [
      "Tu 'utilización' es qué porcentaje de tu línea de crédito estás usando. Si tu línea es S/ 1,000 y debes S/ 300, estás usando el 30%.",
      "Aquí viene lo raro: usar más del 30% de tu línea puede bajar tu score AUNQUE pagues puntual todos los meses. Para el sistema, ir siempre al tope es señal de que dependes del crédito para vivir.",
      "Piénsalo así: alguien que usa el 20% de su línea se ve holgado y en control. Alguien que usa el 90% se ve al límite, aunque nunca se atrase. Los bancos prefieren prestarle al primero.",
      "Un truco legal y gratis: pide un aumento de línea. Si tu línea sube de S/ 1,000 a S/ 2,000 y sigues gastando lo mismo, tu utilización baja de 30% a 15% sin cambiar nada de tu vida. Eso sí — el aumento es para bajar el %, no para gastar más.",
    ],
    quiz: {
      question: "Tu línea es S/ 2,000 y sueles deber S/ 1,200 (60%). Pagas puntual siempre. ¿Cómo afecta eso a tu score?",
      options: [
        "No afecta: lo único que importa es pagar puntual",
        "Lo mejora: demuestras que el banco confía en ti",
        "Puede bajarlo: usar más del 30% se lee como dependencia del crédito",
      ],
      correctIndex: 2,
      explanation: "Pagar puntual es clave, pero no es lo único. Una utilización alta y constante (arriba del 30%) es señal de que vives al límite del crédito, y eso resta puntos aunque nunca te atrases. Bajar el gasto o pedir aumento de línea reduce ese porcentaje.",
    },
  },
  {
    id: "score",
    emoji: "⭐",
    title: "Cómo se construye (y se daña) un score",
    slides: [
      "Tu score es un puntaje que resume tu historial: qué tan probable es que pagues bien. No es magia — se construye con hábitos concretos y medibles.",
      "Lo que SUMA: antigüedad (mientras más tiempo con crédito bien manejado, mejor), pagos puntuales todos los meses, utilización baja (menos del 30%) y un mix sano de productos, como tarjeta más un préstamo.",
      "Lo que RESTA: atrasos — aunque sea 1 día si te reportan —, maxear tu línea, y pedir varios créditos a la vez. Muchas solicitudes juntas gritan 'necesito plata urgente' y asustan al sistema.",
      "¿Y si ya tienes un mal historial? Toma tiempo, pero se sale. Los reportes negativos no son eternos: con deudas al día y meses de buen comportamiento, tu foto mejora poco a poco.",
      "El score no se arregla en una semana ni con trucos mágicos. Se construye igual que un ahorro: constancia aburrida. La buena noticia: cada mes puntual ya está sumando.",
    ],
    quiz: {
      question: "¿Cuál de estas cosas puede DAÑAR tu score aunque tengas buenas intenciones?",
      options: [
        "Pedir varias tarjetas y préstamos en el mismo mes 'para ver cuál sale'",
        "Tener tu tarjeta hace varios años y usarla poco",
        "Pagar el total de tu ciclo antes de la fecha de pago",
      ],
      correctIndex: 0,
      explanation: "Muchas solicitudes de crédito juntas se leen como urgencia por plata y restan puntos. En cambio, la antigüedad con buen manejo y pagar el total puntual son de las cosas que más suman. Si vas a comparar ofertas, hazlo, pero no dejes solicitudes formales regadas por todos lados.",
    },
  },
];
