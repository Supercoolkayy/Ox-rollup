/**
 * Hardhat Arbitrum Patch Plugin
 *
 * Stylus-first. Decides between native handlers and shim predeploys
 * based on `arbitrum.precompiles.mode` (native | shim | auto).
 * In shim mode, seeds from precompiles.config.json, Stylus RPC,
 * or built-in defaults (in that order).
 */


import fs from "fs";
import path from "path";
import { extendEnvironment } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import { HardhatArbitrumPatch, ArbitrumConfig } from "./arbitrum-patch";

import {
  installNativePrecompiles,
  fetchStylusGasTuple,
} from "./native-precompiles";

// Embedded shim bytecode (dist artifacts produced at build time)
import ArbSysShim from "./shims/ArbSysShim.json";
import ArbGasInfoShim from "./shims/ArbGasInfoShim.json";

const ADDR_ARBSYS  = "0x0000000000000000000000000000000000000064";
const ADDR_GASINFO = "0x000000000000000000000000000000000000006c";

const slotHex = (i: number) => "0x" + i.toString(16).padStart(64, "0");
const wordHex = (v: string | number | bigint) =>
  "0x" + BigInt(v).toString(16).padStart(64, "0");

function loadJsonConfig(hre: HardhatRuntimeEnvironment) {
  try {
    const root = hre.config.paths?.root ?? process.cwd();
    const envPath = process.env.ARB_PRECOMPILES_CONFIG; // optional override
    const file = envPath ?? path.join(root, "precompiles.config.json");
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch {}
  return {};
}

/** Best-effort fetch of Stylus fee tuple via ArbGasInfo.getPricesInWei() */
async function fetchPricesFromStylusRpc(rpc: string): Promise<string[] | null> {
  try {
    const { JsonRpcProvider, Contract } = require("ethers");
    const provider = new JsonRpcProvider(rpc);
    const abi = [
      "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)",
    ];
    const gas = new Contract(ADDR_GASINFO, abi, provider);
    const res = await gas.getPricesInWei();
    return res.map((x: any) => x.toString());
  } catch {
    return null;
  }
}




extendEnvironment((hre: HardhatRuntimeEnvironment) => {
  // Defaults (Stylus-first)
  const defaults: ArbitrumConfig & {
    precompiles?: { mode?: "shim" | "native" | "auto" };
    gas?: { pricesInWei?: (string | number | bigint)[] };
  } = {
    enabled: true,
    chainId: 42161,
    arbOSVersion: 20,
    l1BaseFee: BigInt("20000000000"),
    runtime: "stylus",
    precompiles: { mode: "auto" }, // try native, fall back to shim automatically
  };

  const fileCfg = loadJsonConfig(hre);
  const userCfg = (hre.config as any).arbitrum ?? {};
  const config: ArbitrumConfig = { ...defaults, ...fileCfg, ...userCfg };

  if (config.enabled === false) return;

  // Create and attach the core
  const patch = new HardhatArbitrumPatch(config);
  (hre as any).arbitrumPatch = patch;
  (hre as any).arbitrum = (hre as any).arbitrum || patch;

  const mode = config.precompiles?.mode ?? "auto";
  const isLocal =
    hre.network.name === "hardhat" || hre.network.name === "localhost";

  // Capture the original provider.send BEFORE  proxy it
  const origSend = hre.network.provider.send.bind(hre.network.provider);

  let shimInstalled = false;
  let installing = false;
  let nativeAttempted = false;


  async function fetchPricesFromStylusIfRequested(): Promise<(string|number|bigint)[] | null> {
  const useStylus = (config.runtime ?? "stylus") === "stylus";
  const rpc = config.stylusRpc ?? process.env.STYLUS_RPC;
  if (!useStylus || !rpc) return null;

  try {
    const tuple = await fetchStylusGasTuple(hre, rpc);
    return tuple;
  } catch {
    return null;
  }
  }


  async function installShimsRaw() {
    if (shimInstalled || installing) return;
    installing = true;
    
    const fileOrUserPrices = (config as any)?.gas?.pricesInWei;
    const stylusPrices = await fetchPricesFromStylusIfRequested();
    const prices = stylusPrices ?? fileOrUserPrices ?? ["69440","496","2000000000000","100000000","0","100000000"];

    try {
      // precedence: project config file -> hardhat.config -> stylus rpc -> defaults
      const fileOrUserPrices = (config as any)?.gas?.pricesInWei;
      const stylusRpc =
        config.stylusRpc ?? process.env.STYLUS_RPC ?? process.env.NITRO_RPC; // allow NITRO_RPC as fallback env name
      const stylusPrices = stylusRpc
        ? await fetchPricesFromStylusRpc(stylusRpc).catch(() => null)
        : null;

      const prices =
        (fileOrUserPrices as any) ??
        stylusPrices ??
        ([
          "69440",
          "496",
          "2000000000000",
          "100000000",
          "0",
          "100000000",
        ] as const);

      const chainId =
        (config as any).arbSysChainId ?? (config as any).chainId ?? 42161;

      // Only install if not already present
      const [code64, code6c] = await Promise.all([
        origSend("eth_getCode", [ADDR_ARBSYS, "latest"]),
        origSend("eth_getCode", [ADDR_GASINFO, "latest"]),
      ]);
      if (code64 !== "0x" && code6c !== "0x") {
        shimInstalled = true;
        return;
      }

      await origSend("hardhat_setCode", [
        ADDR_ARBSYS,
        (ArbSysShim as any).deployedBytecode,
      ]);
      await origSend("hardhat_setCode", [
        ADDR_GASINFO,
        (ArbGasInfoShim as any).deployedBytecode,
      ]);

      // Seed ArbSys (slot 0 = chainId)
      await origSend("hardhat_setStorageAt", [
        ADDR_ARBSYS,
        slotHex(0),
        wordHex(chainId),
      ]);

      // Seed ArbGasInfo 0..5
      for (let i = 0; i < 6; i++) {
        await origSend("hardhat_setStorageAt", [
          ADDR_GASINFO,
          slotHex(i),
          wordHex((prices as any)[i] ?? 0),
        ]);
      }

      shimInstalled = true;
    } finally {
      installing = false;
    }
  }

  // Expose a helper (tasks/scripts can call `hre.arbitrum.installShims()`)
  (hre as any).arbitrum.installShims = installShimsRaw;

  // Proxy provider.send to perform native/shim setup on first JSON-RPC usage
  hre.network.provider.send = async (method: string, params: any[]) => {
    if (isLocal && (method.startsWith("eth_") || method.startsWith("hardhat_"))) {
      if (mode === "shim" && !shimInstalled && !installing) {
        await installShimsRaw();
      } else if ((mode === "native" || mode === "auto") && !nativeAttempted) {
        nativeAttempted = true;
        const ok = await installNativePrecompiles(hre, patch.getRegistry());
        if (!ok) {
          if (mode === "auto" && !shimInstalled && !installing) {
            await installShimsRaw(); // graceful fallback
          } else if (mode === "native") {
            console.warn(
              "[hardhat-arbitrum-patch] Native install failed; set precompiles.mode='shim' (or 'auto') to use shims."
            );
          }
        }
      }
    }
    return origSend(method, params);
  };

  if (process.env.DEBUG && !(global as any).__ARB_PATCH_LOGGED__) {
    (global as any).__ARB_PATCH_LOGGED__ = true;
    console.log("[hardhat-arbitrum-patch] initialized (Stylus-first)");
    // console.log(patch.getConfigSummary());
  }
});

// Re-exports
export * from "./arbitrum-patch";
export * from "./precompiles/registry";
export * from "./precompiles/arbSys";
export * from "./precompiles/arbGasInfo";
export * from "./tx/tx7e-parser";
export * from "./tx/tx7e-processor";
export * from "./tx/tx7e-integration";
