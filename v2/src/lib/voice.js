const wordNums = {
  "uno": 1, "una": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5,
  "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10,
  "once": 11, "doce": 12, "trece": 13, "catorce": 14, "quince": 15,
  "dieciseis": 16, "diecisiete": 17, "dieciocho": 18, "diecinueve": 19,
  "veinte": 20, "veintiuno": 21, "veintiuna": 21, "veintidos": 22, "veintitres": 23,
  "veinticuatro": 24, "veinticinco": 25, "veintiseis": 26, "veintisiete": 27,
  "veintiocho": 28, "veintinueve": 29,
  "treinta": 30, "cuarenta": 40, "cincuenta": 50, "sesenta": 60,
  "setenta": 70, "ochenta": 80, "noventa": 90,
  "cien": 100, "ciento": 100,
  "doscientos": 200, "doscientas": 200,
  "trescientos": 300, "trescientas": 300,
  "cuatrocientos": 400, "cuatrocientas": 400,
  "quinientos": 500, "quinientas": 500,
  "seiscientos": 600, "seiscientas": 600,
  "setecientos": 700, "setecientas": 700,
  "ochocientos": 800, "ochocientas": 800,
  "novecientos": 900, "novecientas": 900,
};

export function parseAmount(transcript) {
  // First try digit match
  const digitMatch = transcript.match(/(\d[\d.,]*)/);
  if (digitMatch) return parseFloat(digitMatch[1].replace(",", "."));

  // Handle "X mil" with digits
  const digitMilMatch = transcript.match(/(\d+)\s*mil/);
  if (digitMilMatch) {
    let base = parseFloat(digitMilMatch[1]) * 1000;
    const rest = transcript.replace(digitMilMatch[0], "");
    // Add any hundreds/tens/units after "mil"
    let extra = 0;
    for (const [word, val] of Object.entries(wordNums)) {
      if (new RegExp(`\\b${word}\\b`).test(rest)) extra += val;
    }
    return base + extra;
  }

  // Parse word numbers additively: sum hundreds + tens + units
  let hasMil = /\bmil\b/.test(transcript);
  let beforeMil = hasMil ? transcript.split(/\bmil\b/)[0] : "";
  let afterMil = hasMil ? transcript.split(/\bmil\b/).slice(1).join(" ") : transcript;

  const sumWords = (text) => {
    let hundreds = 0, rest = 0;
    for (const [word, val] of Object.entries(wordNums)) {
      if (new RegExp(`\\b${word}\\b`).test(text)) {
        if (val >= 100) hundreds += val;
        else rest += val;
      }
    }
    return hundreds + rest;
  };

  if (hasMil) {
    const milMultiplier = sumWords(beforeMil) || 1;
    return milMultiplier * 1000 + sumWords(afterMil);
  }
  return sumWords(transcript);
}

export function extractDescription(transcript) {
  // Extract description: remove digits, currency words, and matched word numbers
  const wordNumPattern = Object.keys(wordNums).join("|");
  let desc = transcript
    .replace(/(\d[\d.,]*)/g, "")
    .replace(new RegExp(`\\b(${wordNumPattern}|soles?|dolares?|pesos?|mil|con|por|de|y)\\b`, "gi"), "")
    .replace(/\s+/g, " ")
    .trim();
  if (desc) desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  return desc;
}
