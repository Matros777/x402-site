const NETWORKS = {
  "eth-mainnet": { rpc: "https://eth-mainnet.g.alchemy.com/v2", nft: "https://eth-mainnet.g.alchemy.com/nft/v3", explorer: "https://etherscan.io", native: "ETH", usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7" },
  "base-mainnet": { rpc: "https://base-mainnet.g.alchemy.com/v2", nft: "https://base-mainnet.g.alchemy.com/nft/v3", explorer: "https://basescan.org", native: "ETH", usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", usdt: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2" },
  "arb-mainnet": { rpc: "https://arb-mainnet.g.alchemy.com/v2", nft: "https://arb-mainnet.g.alchemy.com/nft/v3", explorer: "https://arbiscan.io", native: "ETH", usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", usdt: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9" },
  "opt-mainnet": { rpc: "https://opt-mainnet.g.alchemy.com/v2", nft: "https://opt-mainnet.g.alchemy.com/nft/v3", explorer: "https://optimistic.etherscan.io", native: "ETH", usdc: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", usdt: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58" },
  "polygon-mainnet": { rpc: "https://polygon-mainnet.g.alchemy.com/v2", nft: "https://polygon-mainnet.g.alchemy.com/nft/v3", explorer: "https://polygonscan.com", native: "MATIC", usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", usdt: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F" }
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
}

async function rpc(base, key, method, params) {
  const r = await fetch(`${base}/${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || "RPC error");
  return j.result;
}

function formatUnits(hex, decimals = 18) {
  try {
    const raw = BigInt(hex || "0x0");
    const d = Number(decimals);
    const base = 10n ** BigInt(d);
    const whole = raw / base;
    const frac = (raw % base).toString().padStart(d, "0").slice(0, 6).replace(/0+$/, "");
    return frac ? `${whole}.${frac}` : whole.toString();
  } catch {
    return "0";
  }
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: cors() });
  }

  const key = context.env.ALCHEMY_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: "ALCHEMY_API_KEY is not set" }), { status: 500, headers: cors() });
  }

  try {
    const url = new URL(context.request.url);
    let address = url.searchParams.get("address") || "";
    let network = url.searchParams.get("network") || "base-mainnet";

    if (context.request.method === "POST") {
      const body = await context.request.json().catch(() => ({}));
      address = body.address || address;
      network = body.network || network;
    }

    address = String(address).trim();
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return new Response(JSON.stringify({ error: "Invalid address" }), { status: 400, headers: cors() });
    }
    if (!NETWORKS[network]) {
      return new Response(JSON.stringify({ error: "Unsupported network" }), { status: 400, headers: cors() });
    }

    const net = NETWORKS[network];

    const balHex = await rpc(net.rpc, key, "eth_getBalance", [address, "latest"]);
    const native = formatUnits(balHex, 18);

    const tokenRes = await rpc(net.rpc, key, "alchemy_getTokenBalances", [address]);
    const rawTokens = (tokenRes.tokenBalances || []).filter(
      (t) => t.tokenBalance && t.tokenBalance !== "0x" && t.tokenBalance !== "0x0"
    );

    const tokens = [];
    for (const t of rawTokens.slice(0, 12)) {
      let symbol = t.contractAddress.slice(0, 6) + "...";
      let decimals = 18;
      try {
        const meta = await rpc(net.rpc, key, "alchemy_getTokenMetadata", [t.contractAddress]);
        symbol = meta.symbol || symbol;
        decimals = meta.decimals ?? 18;
      } catch {}
      tokens.push({
        symbol,
        contract: t.contractAddress,
        balance: formatUnits(t.tokenBalance, decimals)
      });
    }

    const pick = (contract, dec = 6) => {
      const hit = rawTokens.find((t) => t.contractAddress.toLowerCase() === contract.toLowerCase());
      return hit ? formatUnits(hit.tokenBalance, dec) : "0";
    };

    const usdc = pick(net.usdc, 6);
    const usdt = pick(net.usdt, 6);

    const fromTx = await rpc(net.rpc, key, "alchemy_getAssetTransfers", [{
      fromBlock: "0x0",
      toBlock: "latest",
      fromAddress: address,
      category: ["external", "erc20"],
      excludeZeroValue: true,
      maxCount: "0x14",
      order: "desc"
    }]).catch(() => ({ transfers: [] }));

    const toTx = await rpc(net.rpc, key, "alchemy_getAssetTransfers", [{
      fromBlock: "0x0",
      toBlock: "latest",
      toAddress: address,
      category: ["external", "erc20"],
      excludeZeroValue: true,
      maxCount: "0x14",
      order: "desc"
    }]).catch(() => ({ transfers: [] }));

    const map = new Map();
    for (const t of [...(fromTx.transfers || []), ...(toTx.transfers || [])]) {
      map.set((t.hash || "") + (t.category || "") + (t.uniqueId || ""), t);
    }
    const transfers = Array.from(map.values()).slice(0, 20).map((t) => ({
      hash: t.hash,
      category: t.category,
      asset: t.asset,
      value: t.value,
      from: t.from,
      to: t.to,
      direction: (t.to || "").toLowerCase() === address.toLowerCase() ? "in" : "out"
    }));

    let nfts = 0;
    try {
      const nftRes = await fetch(`${net.nft}/${key}/getNFTsForOwner?owner=${address}&withMetadata=false&pageSize=1`);
      if (nftRes.ok) {
        const nftJson = await nftRes.json();
        nfts = nftJson.totalCount || 0;
      }
    } catch {}

    return new Response(JSON.stringify({
      address,
      network,
      explorer: net.explorer,
      nativeSymbol: net.native,
      native,
      usdc,
      usdt,
      nfts,
      tokens,
      transfers,
      tokenCount: rawTokens.length
    }), { headers: cors() });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || "Server error" }), { status: 500, headers: cors() });
  }
}
