//! Arbitrum configuration and initialization for Anvil

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Configuration for Arbitrum mode in Anvil
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArbitrumConfig {
    /// Arbitrum chain ID
    pub chain_id: u64,
    /// ArbOS version
    pub arb_os_version: u32,
    /// L1 base fee in wei
    pub l1_base_fee: u64,
    /// Gas price components
    pub gas_price_components: GasPriceComponents,
    /// 0x7e transaction support enabled
    pub tx7e_enabled: bool,
    /// Mock L1 bridge address
    pub mock_l1_bridge: String,
    /// Precompile addresses and their handlers
    pub precompiles: HashMap<String, PrecompileConfig>,
}

/// Gas price components for Arbitrum
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GasPriceComponents {
    /// L2 base fee in wei
    pub l2_base_fee: u64,
    /// L1 calldata cost per byte in gas
    pub l1_calldata_cost: u64,
    /// L1 storage cost in gas
    pub l1_storage_cost: u64,
    /// Congestion fee in wei
    pub congestion_fee: u64,
}

/// Configuration for individual precompiles
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrecompileConfig {
    /// Precompile address
    pub address: String,
    /// Precompile name
    pub name: String,
    /// Whether this precompile is enabled
    pub enabled: bool,
    /// Additional configuration data
    pub config: HashMap<String, serde_json::Value>,
}

impl Default for ArbitrumConfig {
    fn default() -> Self {
        Self {
            chain_id: 42161, // Arbitrum One
            arb_os_version: 20,
            l1_base_fee: 20_000_000_000, // 20 gwei
            gas_price_components: GasPriceComponents::default(),
            tx7e_enabled: true,
            mock_l1_bridge: "0x0000000000000000000000000000000000000064".to_string(),
            precompiles: Self::default_precompiles(),
        }
    }
}

impl Default for GasPriceComponents {
    fn default() -> Self {
        Self {
            l2_base_fee: 1_000_000_000, // 1 gwei
            l1_calldata_cost: 16,        // 16 gas per byte
            l1_storage_cost: 0,          // No storage gas in Nitro
            congestion_fee: 0,           // No congestion fee by default
        }
    }
}

impl ArbitrumConfig {
    /// Create a new Arbitrum configuration
    pub fn new(chain_id: u64, arb_os_version: u32, l1_base_fee: u64) -> Self {
        Self {
            chain_id,
            arb_os_version,
            l1_base_fee,
            ..Default::default()
        }
    }

    /// Create default precompile configurations
    fn default_precompiles() -> HashMap<String, PrecompileConfig> {
        let mut precompiles = HashMap::new();

        // ArbSys precompile (0x64)
        precompiles.insert(
            "0x0000000000000000000000000000000000000064".to_string(),
            PrecompileConfig {
                address: "0x0000000000000000000000000000000000000064".to_string(),
                name: "ArbSys".to_string(),
                enabled: true,
                config: HashMap::new(),
            },
        );

        // ArbGasInfo precompile (0x6C)
        precompiles.insert(
            "0x000000000000000000000000000000000000006c".to_string(),
            PrecompileConfig {
                address: "0x000000000000000000000000000000000000006c".to_string(),
                name: "ArbGasInfo".to_string(),
                enabled: true,
                config: HashMap::new(),
            },
        );

        precompiles
    }

    /// Load configuration from a JSON file
    pub fn from_file(path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        let config: ArbitrumConfig = serde_json::from_str(&content)?;
        Ok(config)
    }

    /// Save configuration to a JSON file
    pub fn save_to_file(&self, path: &str) -> Result<(), Box<dyn std::error::Error>> {
        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(path, content)?;
        Ok(())
    }

    /// Get a precompile configuration by address
    pub fn get_precompile(&self, address: &str) -> Option<&PrecompileConfig> {
        self.precompiles.get(address)
    }

    /// Check if a precompile is enabled
    pub fn is_precompile_enabled(&self, address: &str) -> bool {
        self.precompiles
            .get(address)
            .map(|p| p.enabled)
            .unwrap_or(false)
    }

    /// Get the L1 gas cost for a given calldata size
    pub fn calculate_l1_gas_cost(&self, calldata_size: usize) -> u64 {
        calldata_size as u64 * self.gas_price_components.l1_calldata_cost
    }

    /// Get the total L1 gas cost in wei for a given calldata size
    pub fn calculate_l1_gas_cost_wei(&self, calldata_size: usize) -> u64 {
        self.calculate_l1_gas_cost(calldata_size) * self.l1_base_fee
    }

    /// Validate the configuration
    pub fn validate(&self) -> Result<(), String> {
        if self.chain_id == 0 {
            return Err("Chain ID cannot be 0".to_string());
        }

        if self.arb_os_version == 0 {
            return Err("ArbOS version cannot be 0".to_string());
        }

        if self.l1_base_fee == 0 {
            return Err("L1 base fee cannot be 0".to_string());
        }

        if self.gas_price_components.l2_base_fee == 0 {
            return Err("L2 base fee cannot be 0".to_string());
        }

        if self.gas_price_components.l1_calldata_cost == 0 {
            return Err("L1 calldata cost cannot be 0".to_string());
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = ArbitrumConfig::default();
        assert_eq!(config.chain_id, 42161);
        assert_eq!(config.arb_os_version, 20);
        assert_eq!(config.l1_base_fee, 20_000_000_000);
        assert!(config.tx7e_enabled);
        assert_eq!(config.mock_l1_bridge, "0x0000000000000000000000000000000000000064");
    }

    #[test]
    fn test_new_config() {
        let config = ArbitrumConfig::new(421613, 21, 15_000_000_000);
        assert_eq!(config.chain_id, 421613);
        assert_eq!(config.arb_os_version, 21);
        assert_eq!(config.l1_base_fee, 15_000_000_000);
    }

    #[test]
    fn test_precompile_config() {
        let config = ArbitrumConfig::default();
        assert!(config.is_precompile_enabled("0x0000000000000000000000000000000000000064"));
        assert!(config.is_precompile_enabled("0x000000000000000000000000000000000000006c"));
        assert!(!config.is_precompile_enabled("0x0000000000000000000000000000000000000000"));
    }

    #[test]
    fn test_l1_gas_calculation() {
        let config = ArbitrumConfig::default();
        let calldata_size = 1000;
        let gas_cost = config.calculate_l1_gas_cost(calldata_size);
        assert_eq!(gas_cost, 16000); // 1000 * 16

        let wei_cost = config.calculate_l1_gas_cost_wei(calldata_size);
        assert_eq!(wei_cost, 320_000_000_000_000); // 16000 * 20_000_000_000
    }

    #[test]
    fn test_config_validation() {
        let mut config = ArbitrumConfig::default();
        assert!(config.validate().is_ok());

        config.chain_id = 0;
        assert!(config.validate().is_err());

        config.chain_id = 42161;
        config.arb_os_version = 0;
        assert!(config.validate().is_err());

        config.arb_os_version = 20;
        config.l1_base_fee = 0;
        assert!(config.validate().is_err());
    }
}
