export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { image, mediaType } = req.body;
  if (!image) {
    return res.status(400).json({ error: "No image provided" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType || "image/jpeg",
                  data: image,
                },
              },
              {
                type: "text",
                text: `Analiza esta imagen de movimientos bancarios o estado de cuenta. Extrae TODOS los gastos/movimientos que veas.

Para cada gasto devuelve:
- description: nombre/concepto del gasto (corto, ej: "Supermercado", "Uber", "Farmacia")
- amount: monto numerico (solo el numero, sin simbolos. Si es negativo o un cargo, ponlo positivo)
- date: fecha en formato YYYY-MM-DD si la ves en la imagen, o null si no hay fecha

Responde SOLO con un JSON array, sin texto adicional, sin backticks. Ejemplo:
[{"description":"Supermercado","amount":45.50,"date":"2026-03-10"},{"description":"Uber","amount":12,"date":"2026-03-10"}]

Si no encuentras gastos, responde: []
Importante: NO incluyas transferencias recibidas o ingresos, solo gastos/cargos/compras.`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    
    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const text = data.content?.[0]?.text || "[]";
    
    // Parse the JSON response
    let expenses = [];
    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      expenses = JSON.parse(cleaned);
    } catch (e) {
      // Try to extract JSON array from text
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          expenses = JSON.parse(match[0]);
        } catch (e2) {
          return res.status(500).json({ error: "No se pudo interpretar la respuesta", raw: text });
        }
      }
    }

    // Validate and clean
    expenses = expenses
      .filter(e => e && e.amount && e.amount > 0)
      .map(e => ({
        description: String(e.description || "Gasto").substring(0, 100),
        amount: Math.abs(Number(e.amount)),
        date: e.date || null,
      }));

    return res.status(200).json({ expenses });
  } catch (error) {
    return res.status(500).json({ error: "Error al conectar con la IA: " + error.message });
  }
}
