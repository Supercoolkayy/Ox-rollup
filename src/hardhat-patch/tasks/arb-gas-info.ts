import { task } from "hardhat/config";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const ADDR_GASINFO = "0x000000000000000000000000000000000000006c" as const;

// --- Types ---

type Six = [string, string, string, string, string, string];
type Three = [string, string, string]; // Bucket D

// Names for the 6-tuple indices (Legacy Wei)
const LEGACY_NAMES = [
  "Per L2 Tx (Stub)",       // [0]
  "Per L1 Calldata (Stub)", // [1]
  "Per Storage (L1 Cost)",  // [2]
  "Per ArbGas Base",        // [3]
  "Per ArbGas Congestion",  // [4]
  "Per ArbGas Total"        // [5]
];

// Names for the 3-tuple indices (ArbGas)
const ARBGAS_NAMES = [
  "ArbGas Per L2 Tx",       // [0]
  "ArbGas Per L1 Call",     // [1]
  "ArbGas Per Storage"      // [2]
];

interface NitroScalars {
  l1BaseFeeEstimate: string;
  minimumGasPrice: string;
  speedLimitPerSecond: string;
  gasPoolMax: string;
  maxBlockGasLimit: string;
  maxTxGasLimit: string;
}

interface NitroConstraint {
  targetPerSecond: string;
  adjustmentWindow: string;
  backlog: string;
}

interface GasInfoState {
  legacy: Six | null;
  arbGas: Three | null; 
  scalars: NitroScalars | null;
  constraints: NitroConstraint[] | null;
}

// --- Formatting Helpers ---

const fmt = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  dim: "\x1b[2m",
  bold: "\x1b[1m"
};

function pad(str: string, len: number) {
  return str.padEnd(len).slice(0, len);
}

function printRow(name: string, local: string, remote: string, isDiff: boolean) {
  const status = isDiff ? `${fmt.red}DIFF${fmt.reset}` : `${fmt.green}OK${fmt.reset}`;
  

  let locDisp = local.length > 18 ? local.substring(0, 15) + "..." : local;
  let remDisp = remote.length > 18 ? remote.substring(0, 15) + "..." : remote;

  if (isDiff) {
      locDisp = `${fmt.red}${pad(locDisp, 20)}${fmt.reset}`;
      remDisp = `${fmt.red}${pad(remDisp, 20)}${fmt.reset}`;
  } else {
      locDisp = pad(locDisp, 20);
      remDisp = pad(remDisp, 20);
  }
  
  console.log(` ${pad(name, 25)} | ${locDisp} | ${remDisp} | ${status}`);
}

function printDivider() {
  console.log(`${fmt.dim} --------------------------+----------------------+----------------------+------${fmt.reset}`);
}

// --- Fetch Logic ---

function asStrings(tuple: any): string[] {
  return Array.from(tuple).map((x: any) => x.toString());
}

async function fetchFullState(hre: HardhatRuntimeEnvironment, rpcUrlOrProvider: string | any): Promise<GasInfoState> {
  const isUrl = typeof rpcUrlOrProvider === "string";
  
  const doCall = async (data: string) => {
    if (isUrl) {
      const res = await fetch(rpcUrlOrProvider, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: ADDR_GASINFO, data }, "latest"] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j: any = await res.json();
      if (j.error) throw new Error(j.error.message);
      return j.result;
    } else {
      return await rpcUrlOrProvider.call({ to: ADDR_GASINFO, data });
    }
  };

  const iface = new (hre as any).ethers.Interface([
    "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)",
    "function getPricesInArbGas() view returns (uint256,uint256,uint256)", // Added
    "function getL1BaseFeeEstimate() view returns (uint256)",
    "function getGasAccountingParams() view returns (uint256, uint256, uint256)",
    "function getMinimumGasPrice() view returns (uint256)",
    "function getMaxTxGasLimit() view returns (uint256)",
    "function getGasPricingConstraints() view returns (tuple(uint64, uint64, uint64)[])"
  ]);

  const state: GasInfoState = { legacy: null, arbGas: null, scalars: null, constraints: null };

  // 1 Fetch Legacy Wei
  try {
    const raw = await doCall(iface.encodeFunctionData("getPricesInWei", []));
    state.legacy = asStrings(iface.decodeFunctionResult("getPricesInWei", raw)) as Six;
  } catch {}

  // 2 Fetch ArbGas (Bucket D)
  try {
    const raw = await doCall(iface.encodeFunctionData("getPricesInArbGas", []));
    state.arbGas = asStrings(iface.decodeFunctionResult("getPricesInArbGas", raw)) as Three;
  } catch {}

  // 3 Fetch Scalars
  try {
    const [rawL1, rawMin, rawAcc] = await Promise.all([
       doCall(iface.encodeFunctionData("getL1BaseFeeEstimate", [])),
       doCall(iface.encodeFunctionData("getMinimumGasPrice", [])),
       doCall(iface.encodeFunctionData("getGasAccountingParams", []))
    ]);
    
    let maxTxGas = "0";
    try {
        const rawTx = await doCall(iface.encodeFunctionData("getMaxTxGasLimit", []));
        maxTxGas = iface.decodeFunctionResult("getMaxTxGasLimit", rawTx)[0].toString();
    } catch {
         const acc = iface.decodeFunctionResult("getGasAccountingParams", rawAcc);
         maxTxGas = acc[2].toString();
    }

    const l1 = iface.decodeFunctionResult("getL1BaseFeeEstimate", rawL1);
    const min = iface.decodeFunctionResult("getMinimumGasPrice", rawMin);
    const acc = iface.decodeFunctionResult("getGasAccountingParams", rawAcc);

    state.scalars = {
        l1BaseFeeEstimate: l1[0].toString(),
        minimumGasPrice: min[0].toString(),
        speedLimitPerSecond: acc[0].toString(),
        gasPoolMax: acc[1].toString(),
        maxBlockGasLimit: acc[2].toString(),
        maxTxGasLimit: maxTxGas
    };
  } catch {}

  // 4 Fetch Constraints
  try {
    const raw = await doCall(iface.encodeFunctionData("getGasPricingConstraints", []));
    const decoded = iface.decodeFunctionResult("getGasPricingConstraints", raw);
    state.constraints = (decoded[0] && Array.isArray(decoded[0])) 
        ? decoded[0].map((c: any) => ({
            targetPerSecond: c[0].toString(),
            adjustmentWindow: c[1].toString(),
            backlog: c[2].toString()
        }))
        : [];
  } catch {}

  return state;
}

// --- Main Task ---

task("arb:gas-info", "Compare local ArbGasInfo tuple with a remote RPC")
  .addFlag("stylus", "Use Stylus RPC")
  .addFlag("nitro", "Use Nitro RPC")
  .addOptionalParam("rpc", "Explicit remote RPC URL")
  .addFlag("json", "Print machine-readable JSON")
  .setAction(async (args, hre) => {
    
    // 1 Fetch Local
    const provider = (hre as any).ethers.provider;
    const localState = await fetchFullState(hre, provider);

    // 2 Resolve Remote
    let remoteRpc: string | null = (args.rpc as string) || null;
    if (!remoteRpc) {
      if (args.stylus) remoteRpc = process.env.STYLUS_RPC || ((hre.config as any).arbitrum?.stylusRpc) || null;
      else if (args.nitro) remoteRpc = process.env.NITRO_RPC || ((hre.config as any).arbitrum?.nitroRpc) || null;
      else {
        const rt = ((hre.config as any).arbitrum?.runtime) || "stylus";
        remoteRpc = rt === "stylus"
            ? process.env.STYLUS_RPC || ((hre.config as any).arbitrum?.stylusRpc) || null
            : process.env.NITRO_RPC || ((hre.config as any).arbitrum?.nitroRpc) || null;
      }
    }

    // 3 Fetch Remote
    let remoteState: GasInfoState = { legacy: null, arbGas: null, scalars: null, constraints: null };
    if (remoteRpc) {
      try {
        remoteState = await fetchFullState(hre, remoteRpc);
      } catch (e: any) {
        if (!args.json) console.error(`${fmt.red}Error fetching remote:${fmt.reset} ${e.message}`);
      }
    }

    // 4 JSON Mode (Exit Early)
    if (args.json) {
      console.log(JSON.stringify({ local: localState, remote: remoteState, rpc: remoteRpc }, null, 2));
      return;
    }

    // 5 Render CLI Table
    console.log(`\n${fmt.bold}Arbitrum Precompile State Comparison${fmt.reset}`);
    console.log(`${fmt.dim}Remote RPC: ${remoteRpc ?? "None"}${fmt.reset}\n`);

    // HEADER
    console.log(` ${pad("Property", 25)} | ${pad("Local", 20)} | ${pad("Remote", 20)} | Status`);
    printDivider();

    // SECTION: LEGACY PRICES
    if (localState.legacy) {
      localState.legacy.forEach((val, i) => {
        const rem = remoteState.legacy ? remoteState.legacy[i] : "-";
        printRow(LEGACY_NAMES[i], val, rem, val !== rem && !!remoteRpc);
      });
    }

    // SECTION: ARBGAS PRICES 
    printDivider();
    if (localState.arbGas) {
      localState.arbGas.forEach((val, i) => {
        const rem = remoteState.arbGas ? remoteState.arbGas[i] : "-";
        printRow(ARBGAS_NAMES[i], val, rem, val !== rem && !!remoteRpc);
      });
    } else {
        console.log(` ${fmt.red}Local ArbGas Data Not Available (Shim out of date?)${fmt.reset}`);
    }

    // SECTION: NITRO SCALARS
    printDivider();
    if (localState.scalars) {
      const keys: (keyof NitroScalars)[] = [
        "l1BaseFeeEstimate", "minimumGasPrice", "speedLimitPerSecond", 
        "gasPoolMax", "maxBlockGasLimit", "maxTxGasLimit"
      ];
      
      keys.forEach(k => {
        const loc = localState.scalars![k];
        const rem = remoteState.scalars ? remoteState.scalars[k] : "-";
        printRow(k, loc, rem, loc !== rem && !!remoteRpc);
      });
    }

    printDivider();

    // SECTION: CONSTRAINTS SUMMARY
    const lCount = localState.constraints?.length ?? 0;
    const rCount = remoteState.constraints?.length ?? 0;
    
    console.log(` ${pad("Pricing Constraints", 25)} | ${pad(`${lCount} active`, 20)} | ${pad(`${rCount} active`, 20)} | ${lCount === rCount ? fmt.green+"OK"+fmt.reset : fmt.red+"DIFF"+fmt.reset}`);
    
    if (lCount > 0) {
        console.log(`\n${fmt.dim}Local Constraints Details:${fmt.reset}`);
        localState.constraints!.forEach((c, i) => {
            console.log(`  [${i}] Target: ${c.targetPerSecond}, Window: ${c.adjustmentWindow}, Backlog: ${c.backlog}`);
        });
    }
    console.log(""); 
  });