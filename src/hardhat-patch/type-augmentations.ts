import "hardhat/types/config";
import "hardhat/types/runtime";
import type { HardhatArbitrumPatch, ArbitrumConfig } from "./arbitrum-patch";

declare module "hardhat/types/config" {
  interface HardhatUserConfig {
    arbitrum?: Partial<ArbitrumConfig>;
  }
  interface HardhatConfig {
    arbitrum?: Partial<ArbitrumConfig>;
  }
}

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    /** Arbitrum precompile integration for tests/scripts */
    arbitrum?: HardhatArbitrumPatch;
    /** Alias for backward compat */
    arbitrumPatch?: HardhatArbitrumPatch;
  }
}
