// Common helpers shared by all m3 tests (no ethers.Interface usage)
const ADDR_GASINFO = "0x000000000000000000000000000000000000006c";

const slotHex = (i) => "0x" + i.toString(16).padStart(64, "0");
const wordHex = (v) => "0x" + BigInt(v).toString(16).padStart(64, "0");

async function ensureShims(hre) {
  const code = await hre.network.provider.send("eth_getCode", [ADDR_GASINFO, "latest"]);
  if (code !== "0x") return;

  if (hre.arbitrum && typeof hre.arbitrum.installShims === "function") {
    await hre.arbitrum.installShims();
  } else {
    // Fallback to the one-shot predeploy script
    await hre.run("run", { script: "scripts/predeploy-precompiles.js" });
  }
}

async function seedTupleSlots(hre, tuple) {
  for (let i = 0; i < 6; i++) {
    await hre.network.provider.send("hardhat_setStorageAt", [
      ADDR_GASINFO,
      slotHex(i),
      wordHex(tuple[i] ?? 0),
    ]);
  }
}

async function readTupleSlots(hre) {
  const out = [];
  for (let i = 0; i < 6; i++) {
    const raw = await hre.network.provider.send("eth_getStorageAt", [
      ADDR_GASINFO,
      slotHex(i),
      "latest",
    ]);
    out.push(BigInt(raw).toString());
  }
  return out;
}

function loadProjectTuple() {
  const fs = require("fs");
  const path = require("path");
  const file =
    process.env.ARB_PRECOMPILES_CONFIG ||
    path.join(process.cwd(), "precompiles.config.json");
  if (fs.existsSync(file)) {
    try {
      const j = JSON.parse(fs.readFileSync(file, "utf8"));
      const arr = j?.gas?.pricesInWei;
      if (Array.isArray(arr) && arr.length === 6) {
        return arr.map(String);
      }
    } catch {}
  }
  return null;
}

module.exports = {
  ADDR_GASINFO,
  ensureShims,
  seedTupleSlots,
  readTupleSlots,
  loadProjectTuple,
};
