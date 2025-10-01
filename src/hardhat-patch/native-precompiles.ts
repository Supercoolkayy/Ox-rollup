import type { HardhatRuntimeEnvironment } from "hardhat/types";


let Address: any;
try {
  // Hardhat >= 2.18 stacks
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Address = require("@nomicfoundation/ethereumjs-util").Address;
} catch {
  // Older stacks
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Address = require("ethereumjs-util").Address;
}


export const ADDR_ARBSYS     = "0x0000000000000000000000000000000000000064" as const;
export const ADDR_ARBGASINFO = "0x000000000000000000000000000000000000006c" as const;

type PrecompileHandler = (opts: {
  data?: Buffer;
  caller?: any;        // ethereumjs Address
  gasLimit?: bigint;
}) => Promise<{ success: boolean; return: Buffer; gasUsed?: bigint }>;

/* -------------------------------------------------------------------------- */
/*                            Internal small helpers                           */
/* -------------------------------------------------------------------------- */

function getVm(hre: HardhatRuntimeEnvironment): any | null {
  // Walk common provider internals across HH versions to find the VM
  const p: any = (hre as any).network?.provider;
  const node =
    p?._node ??
    p?._backedNode ??
    p?._wrapped?._node ??
    p?._jsonRpcServer?._node ??
    null;

  const vm =
    node?._vm ??
    node?._stateManager?._vm ??
    node?._blockchain?._vm ??
    (node && "vm" in node ? (node as any).vm : null) ??
    null;

  return vm || null;
}

function getPrecompileMap(vm: any): Map<any, any> | null {
  const m = (vm as any).precompiles ?? (vm as any)._precompiles ?? null;
  return m && typeof m.set === "function" ? (m as Map<any, any>) : null;
}

function toBuf(u8: Uint8Array | Buffer | string | undefined): Buffer {
  if (!u8) return Buffer.alloc(0);
  if (Buffer.isBuffer(u8)) return u8;
  if (typeof u8 === "string") return Buffer.from(u8.replace(/^0x/, ""), "hex");
  return Buffer.from(u8);
}

function hexToAddress(h: string): any {
  return Address.fromString(h);
}

/* -------------------------------------------------------------------------- */
/*                    Registry-forwarding precompile handler                   */
/* -------------------------------------------------------------------------- */

function makeHandler(
  hre: HardhatRuntimeEnvironment,
  addrHex: string,
  registry: any
): PrecompileHandler {
  return async (opts) => {
    const dataU8 = new Uint8Array(opts?.data ?? []);
    const caller =
      (opts?.caller && "toString" in (opts as any).caller)
        ? `0x${(opts as any).caller.toString()}`
        : "0x" + "00".repeat(20);

    const cfg = (hre.config as any).arbitrum ?? {};
    const chainId = Number(cfg.chainId ?? hre.network.config.chainId ?? 42161);

    let blockNumber = 0;
    try {
      const hex = await hre.network.provider.send("eth_blockNumber", []);
      blockNumber = Number.parseInt(hex, 16);
    } catch { /* ignore */ }

    const context = {
      blockNumber,
      chainId,
      gasPrice: BigInt(1_000_000_000), // baseline; can be tuned/lifted from node later
      caller,
      callStack: [],
    };

    const res = await registry.handleCall(addrHex, dataU8, context);

    return {
      success: !!res?.success,
      return: toBuf(res?.data),
      gasUsed: BigInt(res?.gasUsed ?? 0),
    };
  };
}

/* -------------------------------------------------------------------------- */
/*                         Public: native precompile hook                      */
/* -------------------------------------------------------------------------- */

/**
 * Attempt to install native handlers for the ArbSys (0x64) and ArbGasInfo (0x6c)
 * precompiles inside Hardhat's ethereumjs VM. Returns true if installed.
 */
export async function installNativePrecompiles(
  hre: HardhatRuntimeEnvironment,
  registry: any
): Promise<boolean> {
  try {
    const vm = getVm(hre);
    if (!vm) return false;

    const precompiles = getPrecompileMap(vm);
    if (!precompiles) return false;

    const a64 = hexToAddress(ADDR_ARBSYS);
    const a6c = hexToAddress(ADDR_ARBGASINFO);

    const sysHandler = makeHandler(hre, ADDR_ARBSYS, registry);
    const gasHandler = makeHandler(hre, ADDR_ARBGASINFO, registry);

    precompiles.set(a64, sysHandler);
    precompiles.set(a6c, gasHandler);

    return true;
  } catch {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                  Public: fetch Stylus gas tuple (prices)                    */
/* -------------------------------------------------------------------------- */

/**
 * Fetch the Stylus gas price tuple via ArbGasInfo.getPricesInWei() from a Stylus RPC.
 * Returns an array of 6 decimal strings (uint256s).
 *
 * NOTE: Requires @nomicfoundation/hardhat-ethers (ethers v6) to be loaded in the project.
 */
export async function fetchStylusGasTuple(
  hre: HardhatRuntimeEnvironment,
  stylusRpc: string
): Promise<string[]> {
  // Prefered ethers v6 Interface for encoding/decoding
  const ethersAny = (hre as any).ethers;
  if (!ethersAny?.Interface) {
    throw new Error(
      "fetchStylusGasTuple: ethers Interface not available; add @nomicfoundation/hardhat-ethers to your project."
    );
  }

  const iface = new ethersAny.Interface([
    "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)",
  ]);
  const data = iface.encodeFunctionData("getPricesInWei", []);

  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_call",
    params: [{ to: ADDR_ARBGASINFO, data }, "latest"],
  };

  const res = await fetch(stylusRpc, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Stylus RPC HTTP ${res.status}`);
  const j: any = await res.json();
  if (j?.error) throw new Error(`Stylus RPC error: ${j.error.message ?? "unknown"}`);

  const decoded = iface.decodeFunctionResult("getPricesInWei", j.result);
  return decoded.map((x: any) => x.toString());
}
