#!/usr/bin/env node
/* eslint-disable no-console */
const { Command } = require("commander");
const { spawn } = require("child_process");


let Interface;
try {
  ({ Interface } = require("ethers"));
} catch (e) {
  console.error("Missing dependency: ethers@^6");
  process.exit(1);
}

/** Constants */
const ADDR_GASINFO = "0x000000000000000000000000000000000000006c";

/** Defaults (can be overridden with flags/env) */
const DEFAULT_LOCAL = process.env.LOCAL_RPC || "http://127.0.0.1:8549"; //  dev port used here
const DEFAULT_REMOTE = process.env.STYLUS_RPC || null;


/** Minimal JSON-RPC helper (Node 18+ has global fetch) */
async function rpcCall(rpcUrl, method, params) {
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC ${method} HTTP ${res.status}`);
  const j = await res.json();
  if (j.error) throw new Error(`RPC ${method} error: ${j.error.message || "unknown"}`);
  return j.result;
}

/** Encode/decode getPricesInWei() via ethers v6 Interface */
const GAS_ABI = [
  "function getPricesInWei() view returns (uint256,uint256,uint256,uint256,uint256,uint256)"
];
const gasIface = new Interface(GAS_ABI);

async function readTupleViaRpc(rpcUrl, addr = ADDR_GASINFO) {
  const data = gasIface.encodeFunctionData("getPricesInWei", []);
  const result = await rpcCall(rpcUrl, "eth_call", [{ to: addr, data }, "latest"]);
  const decoded = gasIface.decodeFunctionResult("getPricesInWei", result);
  return Array.from(decoded).map(x => x.toString());
}

function diffTuples(localArr, remoteArr) {
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const l = localArr?.[i] ?? "-";
    const r = remoteArr?.[i] ?? "-";
    rows.push({ idx: i, local: l, remote: r, equal: l === r });
  }
  const allEqual = rows.every((x) => x.equal);
  return { rows, allEqual };
}

function runHardhatScript(scriptRel, network) {
  return new Promise((resolve, reject) => {
    const npx = process.platform === "win32" ? "npx.cmd" : "npx";
    const args = ["hardhat", "--config", "hardhat.config.js", "run"];
    if (network) args.push("--network", network);
    args.push(scriptRel);

    const p = spawn(npx, args, {
      stdio: "inherit",
      cwd: process.cwd(),
      env: process.env,
    });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`hardhat run exited ${code}`))));
  });
}



/** Pretty table printer */
function printTable(local, remote, localUrl, remoteUrl) {
  console.log("Local :", local, localUrl ? `(${localUrl})` : "");
  console.log("Remote:", remote ?? null, remoteUrl ? `(${remoteUrl})` : "(no RPC)");
  console.log("");
  for (const row of diffTuples(local, remote).rows) {
    console.log(`[${row.idx}] ${row.local} ${row.equal ? "==" : "!="} ${row.remote}`);
  }
}



/** Commander wiring */
const program = new Command();

program.name("arb-probe").description("Small CLI to exercise gas info and ERC deployments").version("0.1.0");

// gasinfo compare 
const gas = program.command("gasinfo").description("Gas info utilities");
gas
  .command("compare")
  .option("--local <url>", "Local Hardhat RPC URL", process.env.LOCAL_RPC || "http://127.0.0.1:8549")
  .option("--remote <url>", "Remote Stylus RPC URL", process.env.STYLUS_RPC || "")
  .option("--json", "Print machine-readable JSON", false)
  .action(async (opts) => {
    try {
      const localUrl = opts.local || DEFAULT_LOCAL;
      const remoteUrl = opts.remote || DEFAULT_REMOTE || null;

      // Read local
      let local = null;
      try {
        local = await readTupleViaRpc(localUrl, ADDR_GASINFO);
      } catch (e) {
        console.error(`Failed to read LOCAL tuple (${localUrl}): ${e.message}`);
        process.exit(2);
      }

      // Read remote 
      let remote = null;
      if (remoteUrl) {
        try {
          remote = await readTupleViaRpc(remoteUrl, ADDR_GASINFO);
        } catch (e) {
          console.error(`Failed to read REMOTE tuple (${remoteUrl}): ${e.message}`);
          // Do not exit non-zero; continue to show local-only result
        }
      }

      if (opts.json) {
        const { rows, allEqual } = diffTuples(local, remote);
        console.log(JSON.stringify({
          local, remote,
          localUrl, remoteUrl,
          equal: allEqual,
          rows
        }, null, 2));
        // Exit code: if remote present and not equal, use 10 (useful for CI diffs)
        if (remote && !allEqual) process.exit(10);
        process.exit(0);
      } else {
        printTable(local, remote, localUrl, remoteUrl);
        if (remote) {
          const { allEqual } = diffTuples(local, remote);
          if (!allEqual) process.exit(10);
        }
        process.exit(0);
      }
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  });

// ERC20 deploy via Hardhat
const erc20 = program.command("erc20").description("ERC20 helpers");
erc20
  .command("deploy")
  .option("--network <name>", "Hardhat network", "localhost")
  .action(async (opts) => {
    try {
      await runHardhatScript("scripts/examples/deploy-erc20.js", opts.network);
      process.exit(0);
    } catch (e) {
      console.error(e.message || e);
      process.exit(1);
    }
  });

// ERC721 deploy via Hardhat
const erc721 = program.command("erc721").description("ERC721 helpers");
erc721
  .command("deploy")
  .option("--network <name>", "Hardhat network", "localhost")
  .action(async (opts) => {
    try {
      await runHardhatScript("scripts/examples/deploy-erc721.js", opts.network);
      process.exit(0);
    } catch (e) {
      console.error(e.message || e);
      process.exit(1);
    }
  });

program.parseAsync(process.argv);