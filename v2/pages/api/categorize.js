export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { expenses, categories } = req.body;
  if (!expenses?.length || !categories?.length) return res.status(400).json({ error: "Missing data" });

  const catList = categories.map(c => c.name).join(", ");
  const expList = expenses.map(e => `- id="${e.id}" | "${e.description}" | ${e.amount}`).join("\n");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: `Eres un categorizador de gastos. Asigna la categoría más apropiada a cada gasto.

Categorías disponibles: ${catList}

Gastos:
${expList}

Responde SOLO con un JSON array así:
[{"id":"expense_id","categoryName":"Nombre exacto de categoría o null si no hay match"}]

No incluyas nada más, solo el JSON.`
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "[]";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return res.status(500).json({ error: "Invalid AI response" });

    const parsed = JSON.parse(match[0]);
    const suggestions = parsed.map(item => ({
      expId: item.id,
      category: item.categoryName ? (categories.find(c => c.name === item.categoryName) || null) : null
    }));

    res.json({ suggestions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
