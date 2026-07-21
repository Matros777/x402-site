/* ============================================================
   x402-ai-agent.space — combined Worker: раздаёт статику сайта (через env.ASSETS)
   + проксирует /api/chat в OpenRouter (бесплатная модель tencent/hy3:free).
   Один домен => нет CORS, нет зависимости от второго субдомена.
   Ключ OpenRouter в секрете OPENROUTER_API_KEY (wrangler secret).
   ============================================================ */

const SYSTEM_PROMPT = `Ты — помощник сайта x402-ai-agent.space. Отвечай кратко, по фактам, на русском.
Темы:
1) Протокол x402 — открытый стандарт машинных платежей (x402.org, docs.x402.org; изначально от Coinbase CDP). Сервер отвечает HTTP 402 Payment Required с инструкцией в заголовке PAYMENT-REQUIRED (цена в USDC, обычно сеть Base). Клиент подписывает платёж кошельком и повторяет запрос. Подходит для микроплатежей ИИ-агентов за API. Есть официальный Python SDK (pip install x402) и TypeScript-клиент.
2) x402-wallet — CLI-кошелёк для x402-платежей (x402-wallet.com, GitHub 0xKoda/x402-wallet): хранит ключи, создаёт платёжные авторизации для pay-per-use API. Альтернативы: CDP-managed wallet (без приватных ключей у вас). Точный тип кошелька зависит от реализации.
3) Агент сигналов (crypto-snapshot-pro) — пример рабочего ИИ-агента: сканирует BTC/ETH, ищет дивергенции RSI и объёмные импульсы, присылает сигналы для грид-ботов. Это НЕ финсовет и НЕ гарантия прибыли. Торговля рискованна.
Не давай финансовых советов. Не обещай прибыль. Если не знаешь точных команд — скажи, что точные имена пакетов зависят от версии, и посоветуй смотреть docs.x402.org. Веди себя спокойно, без рекламного тона.`;

const MODEL = "tencent/hy3:free";

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ---- CORS preflight ----
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // ---- API: чат через OpenRouter ----
    if (url.pathname === "/api/chat" && request.method === "POST") {
      let userMsg = "";
      try {
        const body = await request.json();
        userMsg = (body.message || "").toString().slice(0, 2000);
      } catch (e) {
        return json({ error: "bad json" }, 400);
      }
      if (!userMsg.trim()) return json({ error: "empty message" }, 400);

      const key = env.OPENROUTER_API_KEY;
      if (!key) return json({ error: "gateway not configured" }, 500);

      try {
        const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://x402-ai-agent.space",
            "X-Title": "x402-ai-agent.space AI Widget",
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userMsg },
            ],
            max_tokens: 600,
            temperature: 0.5,
            reasoning: { enabled: false },
          }),
        });
        if (!upstream.ok) {
          const txt = await upstream.text();
          return json({ error: "upstream error", detail: txt.slice(0, 300) }, 502);
        }
        const data = await upstream.json();
        const reply = data?.choices?.[0]?.message?.content?.trim() || "…";
        return json({ reply });
      } catch (e) {
        return json({ error: "gateway failure", detail: String(e).slice(0, 200) }, 502);
      }
    }

    // ---- Статика: отдаём любой файл из папки сайта (включая /blog/*) ----
    return env.ASSETS.fetch(request);
  },
};
