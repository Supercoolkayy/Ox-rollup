# **CLI Probe Tool (Official Documentation)**
---
**Scope:** Standalone command-line probe for Milestone 3 that validates shim behavior and provides quick smoke checks. The tool reads local gas tuples from the ArbGasInfo shim, optionally compares against a Stylus RPC, and deploys sample ERC20/ ERC721 contracts on a local Hardhat node.
**Source locations:**

* CLI entry: `probes/cli/arb-probe.js`
* Example deploy scripts: `scripts/examples/deploy-erc20.js`, `scripts/examples/deploy-erc721.js`
* Shim predeploy script: `scripts/predeploy-precompiles.js`

---

## **Purpose & Capabilities**

### Objectives

* Rapidly verify **local shim gas tuple** vs **Stylus RPC tuple** without altering remote chains.
* Execute **minimal ERC20/ ERC721 smoke deployments** against a local Hardhat node to confirm toolchain health.

### Supported operations

| Operation            | Description                                                                                  | Primary Source Paths                |
| -------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Gas info compare** | Reads ArbGasInfo tuple from local node; optionally fetches from Stylus RPC and compares.     | `probes/cli/arb-probe.js`           |
| **ERC20 deploy**     | Deploys a sample ERC20, prints address and basic metadata, performs one simple transfer.     | `scripts/examples/deploy-erc20.js`  |
| **ERC721 deploy**    | Deploys a sample ERC721, prints address and metadata, mints a token, prints token ownership. | `scripts/examples/deploy-erc721.js` |

---

## **Preconditions & Environment**

### Local chain and shims

* A Hardhat node must be reachable (default expectation: `http://127.0.0.1:8549`).
* Precompile shims must be installed at the canonical addresses:

  * `ArbSys` at `0x0000000000000000000000000000000000000064`
  * `ArbGasInfo` at `0x000000000000000000000000000000000000006c`
* Shim predeployment is performed via `scripts/predeploy-precompiles.js`.

### Environment variables (optional)

| Variable        | Purpose                                                                 | Typical Value / Notes                             |
| --------------- | ----------------------------------------------------------------------- | ------------------------------------------------- |
| `LOCAL_RPC`     | Overrides local JSON-RPC endpoint used by the gas compare subcommand.   | Default behavior assumes `http://127.0.0.1:8549`. |
| `STYLUS_RPC`    | Enables remote stylus tuple fetching for side-by-side comparison.       | Example: a Stylus Sepolia RPC endpoint.           |
| `NODE_OPTIONS`  | Stability hint for DNS resolution in some environments.                 | `--dns-result-order=ipv4first`                    |
| `NODE_NO_HTTP2` | Disables HTTP/2 negotiation (stability on WSL/docker/CI in some cases). | `1`                                               |

**Security model:** All remote access performed by the probe is **read-only** (e.g., `eth_call`). No writes are attempted against remote endpoints.

---

## **Command Surface (No Code)**

The probe exposes a single entry with subcommands. The following table captures intent and behavior, without showing code or literal shell commands.

### Gas info comparison

| Aspect        | Specification                                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Name          | `gasinfo compare`                                                                                                                        |
| Local source  | Reads `getPricesInWei()` from `0x…006c` on the configured local JSON-RPC endpoint.                                                       |
| Remote source | Optionally reads `getPricesInWei()` from the RPC in `STYLUS_RPC` (or a provided remote URL).                                             |
| Output        | Prints a labeled local tuple and (if present) a labeled remote tuple, followed by a per-index equality summary.                          |
| Mode flags    | JSON output mode is available for machine-readable diffing in CI.                                                                        |
| Exit status   | `0` if successful and either no remote provided or tuples are equal; `10` if remote provided and tuples differ; `2` if local read fails. |
| Notes         | Remote fetch errors are surfaced but do not abort comparison of the local tuple; equality summary still prints.                          |

**Displayed fields (human-readable mode):**

* **Local:** tuple array and the local RPC URL in parentheses.
* **Remote:** tuple array and the remote RPC URL in parentheses (or null when absent).
* **Index lines:** six rows, one per tuple index, each row marking equality/inequality.

### ERC20 deployment

| Aspect      | Specification                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| Name        | `erc20 deploy`                                                                                        |
| Behavior    | Compiles if needed, deploys a sample ERC20, prints deployed address; shows name, symbol, totalSupply. |
| Post-deploy | Executes one sample transfer and prints recipient balance.                                            |
| Network     | Targets the configured local Hardhat network.                                                         |
| Exit status | `0` on success; non-zero on failure.                                                                  |
| Source path | `scripts/examples/deploy-erc20.js`                                                                    |

### ERC721 deployment

| Aspect      | Specification                                                                                |
| ----------- | -------------------------------------------------------------------------------------------- |
| Name        | `erc721 deploy`                                                                              |
| Behavior    | Compiles if needed, deploys a sample ERC721, prints deployed address; shows name and symbol. |
| Post-deploy | Mints `tokenId 1` to a known address, prints `ownerOf(tokenId)` for verification.            |
| Network     | Targets the configured local Hardhat network.                                                |
| Exit status | `0` on success; non-zero on failure.                                                         |
| Source path | `scripts/examples/deploy-erc721.js`                                                          |

---

## **Expected Console Signals (Informational)**

The following messages characterize normal operation; exact numeric values vary with configuration and tuple sources.

* **Shim predeployment:** confirmation that bytecode has been placed at `0x…64` and `0x…6c`.
* **Gas compare:**

  * A **Local** tuple line with the local RPC URL.
  * A **Remote** tuple line with the remote RPC URL (when configured).
  * Six **index comparison** lines indicating equality (`==`) or inequality (`!=`) per position.
* **ERC20 deployment:**

  * Deployed address.
  * Token metadata (name, symbol, total supply).
  * A sample transfer line and resulting recipient balance.
* **ERC721 deployment:**

  * Deployed address.
  * Token metadata (name, symbol).
  * A mint line for `tokenId 1` and a subsequent `ownerOf` line.

---

## **Exit Codes & CI Semantics**

| Exit Code | Meaning                                                              | CI Usage                                                                  |
| --------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `0`       | Operation completed successfully.                                    | Green path for both comparison and deployments.                           |
| `10`      | Gas tuples compared and **differ** when a remote source was present. | Useful for surfacing drift between local shim tuple and Stylus RPC tuple. |
| `2`       | Local tuple read failed (e.g., local RPC not reachable).             | Signals a test-environment issue that must be addressed.                  |
| `1`       | Generic error (unexpected exception or deployment failure).          | Indicates a hard failure; logs should be reviewed.                        |

---

## **Acceptance Checklist ✅**

* ✅ **Local vs. Remote gas comparison** outputs human-readable rows with equality markers per index.
* ✅ **ERC20 deploy** prints a contract address, token metadata, and a sample transfer with resulting balance.
* ✅ **ERC721 deploy** prints a contract address, token metadata, mints `tokenId 1`, and prints token ownership.
* ✅ **Remote access is read-only** (`eth_call` only); no writes to remote networks are attempted.
* ✅ **Return codes** are suitable for CI gates: `0` (success), `10` (tuple mismatch with remote), non-zero on failures.

---

## **Operational Notes & Limitations**

* **Determinism:** The local tuple is the source of truth for tests; reseeding the shim determines the values returned by local reads.
* **Remote volatility:** Remote tuples may change over time due to live network conditions; the compare subcommand reflects that reality without mutating local state.
* **Network stability:** In some environments (WSL/docker/CI), enabling IPv4 preference and disabling HTTP/2 improves RPC stability; environment toggles listed above are supported.
* **Rate limits:** Public RPCs may rate-limit requests; comparison remains useful even when remote access temporarily fails, as the tool continues to display the local tuple and a clear failure message for the remote fetch.

---

## **File Map & Responsibilities**

| File Path                           | Responsibility                                                         |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `probes/cli/arb-probe.js`           | CLI entry; subcommand wiring; RPC reads; table printing; exit codes.   |
| `scripts/predeploy-precompiles.js`  | Predeploys `ArbSys`/`ArbGasInfo` shim bytecode at canonical addresses. |
| `scripts/examples/deploy-erc20.js`  | Sample ERC20 deployment and basic interactions.                        |
| `scripts/examples/deploy-erc721.js` | Sample ERC721 deployment and basic interactions.                       |

---

## **Summary**

* Single CLI tool with three subcommands covering **gas comparison** and **token deployment** smoke checks.
* Explicit **exit codes** enabling CI automation.
* Clear, structured **console signals** enabling fast operator assessment.
* Read-only interaction with remote RPCs, preserving safety of production endpoints.
