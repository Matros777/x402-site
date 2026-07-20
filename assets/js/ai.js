/* ============================================================
   x402.ai — AI assistant widget
   System prompt: факты про x402 + x402-wallet + агент сигналов.
   Без агрессивной рекламы, отвечает по сути.
   Движок: локальный эвристический ответ (fallback) +
   опциональный внешний LLM-endpoint (вставьте URL/токен позже).
   ============================================================ */

const SYSTEM_PROMPT = `Ты — помощник сайта x402.ai. Отвечай кратко, по фактам, на русском.
Темы:
1) Протокол x402 — открытый стандарт машинных платежей (x402.org, docs.x402.org; изначально от Coinbase CDP). Сервер отвечает HTTP 402 Payment Required с инструкцией в заголовке PAYMENT-REQUIRED (цена в USDC, обычно сеть Base). Клиент подписывает платёж кошельком и повторяет запрос. Подходит для микроплатежей ИИ-агентов за API. Есть официальный Python SDK (pip install x402) и TypeScript-клиент.
2) x402-wallet — CLI-кошелёк для x402-платежей (x402-wallet.com, GitHub 0xKoda/x402-wallet): хранит ключи, создаёт платёжные авторизации для pay-per-use API. Альтернативы: CDP-managed wallet (без приватных ключей у вас). Точный тип кошелька зависит от реализации.
3) Агент сигналов (crypto-snapshot-pro) — пример рабочего ИИ-агента: сканирует BTC/ETH, ищет дивергенции RSI и объёмные импульсы, присылает сигналы для грид-ботов. Это НЕ финсовет и НЕ гарантия прибыли. Торговля рискованна.
Не давай финансовых советов. Не обещай прибыль. Если не знаешь точных команд — скажи, что точные имена пакетов зависят от версии, и посоветуй смотреть docs.x402.org. Веди себя спокойно, без рекламного тона.`;

// ---- DOM ----
const fab = document.getElementById('ai-fab');
const panel = document.getElementById('ai-panel');
const closeBtn = document.getElementById('ai-close');
const msgs = document.getElementById('ai-msgs');
const input = document.getElementById('ai-text');
const sendBtn = document.getElementById('ai-send');

fab.onclick = () => panel.classList.add('open');
closeBtn.onclick = () => panel.classList.remove('open');

function addMsg(text, who){
  const d = document.createElement('div');
  d.className = 'msg ' + who;
  d.textContent = text;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}

// ---- Локальная эвристика (работает без интернета) ----
function localAnswer(q){
  const s = q.toLowerCase();
  if (s.includes('x402')){
    return 'x402 — открытый протокол машинных платежей (x402.org, docs.x402.org). Сервер отвечает «402 Payment Required» с инструкцией в заголовке PAYMENT-REQUIRED (цена в USDC, обычно сеть Base). Клиент подписывает платёж кошельком и повторяет запрос. Есть официальный Python SDK: pip install x402.';
  }
  if (s.includes('wallet') || s.includes('кошел') || s.includes('x402-wallet')){
    return 'x402-wallet — CLI-кошелёк для x402-платежей: хранит приватные ключи и создаёт платёжные авторизации для pay-per-use API (x402-wallet.com). Альтернатива — CDP-managed wallet (ключи у провайдера). Базовый путь: поставить кошелёк, создать агентский кошелёк в сети Base, пополнить USDC, подключить к агенту как платёжный провайдер. Точные команды зависят от версии — см. docs.x402.org.';
  }
  if (s.includes('сигнал') || s.includes('бот') || s.includes('agent') || s.includes('агент')){
    return 'Агент сигналов (crypto-snapshot-pro) — рабочий пример ИИ-агента: круглосуточно сканирует BTC/ETH, ищет дивергенции RSI и объёмные импульсы и присылает сигналы для грид-ботов. Это не финсовет и не гарантия прибыли — решать, торговать или нет, вам. Подробнее: https://crypto-snapshot-pro.onrender.com/app';
  }
  if (s.includes('установ') || s.includes('install') || s.includes('запуст') || s.includes('pip') || s.includes('npm')){
    return 'Базовый путь: 1) pip install x402 (Python SDK) и/или npm i -g x402-wallet (CLI-кошелёк); 2) создать кошелёк агента в сети Base; 3) пополнить USDC; 4) в коде агента использовать x402-клиент — он сам поймёт 402 и заплатит. Точные команды зависят от версии — смотрите docs.x402.org.';
  }
  if (s.includes('привет') || s.includes('hello') || s === ''){
    return 'Привет. Спрашивайте про x402, x402-wallet или агента сигналов — отвечу по фактам.';
  }
  return 'Коротко: x402 — это платежи для агентов через ответ 402 Payment Required и заголовок PAYMENT-REQUIRED (USDC, Base); x402-wallet подписывает такие платежи; агент сигналов — пример живого агента, сканирующего BTC/ETH. Уточните вопрос, и я отвечу точнее.';
}

async function handleSend(){
  const text = input.value.trim();
  if (!text) return;
  addMsg(text, 'me');
  input.value = '';

  // Попытка вызвать внешний LLM, если настроен (PLACEHOLDER).
  // Вставьте URL и токен — тогда ответы будут умнее локальных.
  const LLM_ENDPOINT = null; // напр. "https://your-fn.example.com/chat"
  if (LLM_ENDPOINT){
    try{
      const r = await fetch(LLM_ENDPOINT, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ system: SYSTEM_PROMPT, message: text })
      });
      const j = await r.json();
      addMsg(j.reply || localAnswer(text), 'bot');
      return;
    }catch(e){ /* fallback */ }
  }
  // Иначе — локальный ответ
  setTimeout(() => addMsg(localAnswer(text), 'bot'), 250);
}

sendBtn.onclick = handleSend;
input.addEventListener('keydown', e => { if (e.key === 'Enter') handleSend(); });
