const GAS_URL = "https://script.google.com/macros/s/AKfycbwf5AklY1S3w9Ba28oLx4BllIWl4ucS5Tdlyh1kgbicqJQgPrQqmbcxqLD85dbN68FBDQ/exec";

export default async function handler(req, res) {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method === "GET") {
      const action = req.query.action || "all";
      const url = `${GAS_URL}?action=${encodeURIComponent(action)}&cache=${Date.now()}`;

      const response = await fetch(url, {
        method: "GET",
        redirect: "follow"
      });

      const text = await response.text();

      try {
        const json = JSON.parse(text);
        return res.status(200).json(json);
      } catch (err) {
        return res.status(500).json({
          ok: false,
          error: "Apps Script não retornou JSON válido.",
          raw: text.slice(0, 800)
        });
      }
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});

      const response = await fetch(GAS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body,
        redirect: "follow"
      });

      const text = await response.text();

      try {
        const json = JSON.parse(text);
        return res.status(200).json(json);
      } catch (err) {
        return res.status(500).json({
          ok: false,
          error: "Apps Script não retornou JSON válido no POST.",
          raw: text.slice(0, 800)
        });
      }
    }

    return res.status(405).json({
      ok: false,
      error: "Método não permitido."
    });

  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err && err.message ? err.message : String(err)
    });
  }
}
