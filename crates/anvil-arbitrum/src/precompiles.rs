//! Arbitrum precompile implementations for Anvil

use crate::arbitrum::ArbitrumConfig;
use anyhow::{anyhow, Result};

/// Simple address type (20 bytes)
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct Address([u8; 20]);

impl Address {
    pub fn new(bytes: [u8; 20]) -> Self {
        Self(bytes)
    }
    
    pub fn as_bytes(&self) -> &[u8; 20] {
        &self.0
    }
    
    pub fn from_hex(hex: &str) -> Result<Self> {
        let hex = hex.strip_prefix("0x").unwrap_or(hex);
        if hex.len() != 40 {
            return Err(anyhow!("Invalid address length"));
        }
        
        let mut bytes = [0u8; 20];
        for (i, chunk) in hex.as_bytes().chunks(2).enumerate() {
            if i >= 20 {
                break;
            }
            let byte = u8::from_str_radix(
                std::str::from_utf8(chunk)?,
                16
            )?;
            bytes[i] = byte;
        }
        
        Ok(Self(bytes))
    }
}

impl std::fmt::Display for Address {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "0x")?;
        for byte in &self.0 {
            write!(f, "{:02x}", byte)?;
        }
        Ok(())
    }
}

impl std::str::FromStr for Address {
    type Err = anyhow::Error;
    
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::from_hex(s)
    }
}

/// Simple U256 type
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct U256([u8; 32]);

impl U256 {
    pub fn new(bytes: [u8; 32]) -> Self {
        Self(bytes)
    }
    
    pub fn from_u64(value: u64) -> Self {
        let mut bytes = [0u8; 32];
        bytes[24..32].copy_from_slice(&value.to_be_bytes());
        Self(bytes)
    }
    
    pub fn from_big_endian(bytes: &[u8]) -> Self {
        let mut result = [0u8; 32];
        let start = 32 - bytes.len().min(32);
        result[start..].copy_from_slice(&bytes[..bytes.len().min(32)]);
        Self(result)
    }
    
    pub fn to_big_endian(&self) -> Vec<u8> {
        self.0.to_vec()
    }
    
    pub fn zero() -> Self {
        Self([0u8; 32])
    }
}

impl std::ops::Add for U256 {
    type Output = Self;
    
    fn add(self, other: Self) -> Self {
        let mut result = [0u8; 32];
        let mut carry = 0u16;
        
        for i in (0..32).rev() {
            let sum = self.0[i] as u16 + other.0[i] as u16 + carry;
            result[i] = (sum & 0xff) as u8;
            carry = sum >> 8;
        }
        
        Self(result)
    }
}

impl std::fmt::Display for U256 {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        // Convert to hex string for display
        write!(f, "0x")?;
        for byte in &self.0 {
            write!(f, "{:02x}", byte)?;
        }
        Ok(())
    }
}

/// Precompile handler trait
pub trait PrecompileHandler: Send + Sync {
    /// Get the precompile address
    fn address(&self) -> Address;
    /// Get the precompile name
    fn name(&self) -> &str;
    /// Handle a precompile call
    fn handle_call(&self, input: &[u8], config: &ArbitrumConfig) -> Result<Vec<u8>>;
    /// Get the gas cost for the call
    fn gas_cost(&self, input: &[u8]) -> u64;
}

/// ArbSys precompile handler (0x64)
pub struct ArbSysHandler {
    address: Address,
}

impl ArbSysHandler {
    pub fn new() -> Self {
        Self {
            address: Address::from_hex("0x0000000000000000000000000000000000000064").unwrap(),
        }
    }
}

impl PrecompileHandler for ArbSysHandler {
    fn address(&self) -> Address {
        self.address.clone()
    }

    fn name(&self) -> &str {
        "ArbSys"
    }

    fn handle_call(&self, input: &[u8], config: &ArbitrumConfig) -> Result<Vec<u8>> {
        if input.len() < 4 {
            return Err(anyhow!("Input too short for function selector"));
        }

        // Extract function selector (first 4 bytes)
        let selector = &input[0..4];
        let selector_hex = hex::encode(selector);

        match selector_hex.as_str() {
            "d127f54a" => self.handle_arb_chain_id(config),           // arbChainID()
            "a3b1b31d" => self.handle_arb_block_number(config),        // arbBlockNumber()
            "051038f2" => self.handle_arb_os_version(config),         // arbOSVersion()
            _ => Err(anyhow!("Unknown function selector: 0x{}", selector_hex)),
        }
    }

    fn gas_cost(&self, _input: &[u8]) -> u64 {
        3 // Minimal gas cost for simple calls
    }
}

impl ArbSysHandler {
    /// Handle arbChainID() call
    fn handle_arb_chain_id(&self, config: &ArbitrumConfig) -> Result<Vec<u8>> {
        let chain_id = U256::from_u64(config.chain_id);
        Ok(chain_id.to_big_endian())
    }

    /// Handle arbBlockNumber() call
    fn handle_arb_block_number(&self, _config: &ArbitrumConfig) -> Result<Vec<u8>> {
        // For now, return a mock block number
        // In a real implementation, this would query the current block
        let block_number = U256::from_u64(1u64);
        Ok(block_number.to_big_endian())
    }

    /// Handle arbOSVersion() call
    fn handle_arb_os_version(&self, config: &ArbitrumConfig) -> Result<Vec<u8>> {
        let version = U256::from_u64(config.arb_os_version as u64);
        Ok(version.to_big_endian())
    }
}

/// ArbGasInfo precompile handler (0x6C)
pub struct ArbGasInfoHandler {
    address: Address,
}

impl ArbGasInfoHandler {
    pub fn new() -> Self {
        Self {
            address: Address::from_hex("0x000000000000000000000000000000000000006c").unwrap(),
        }
    }
}

impl PrecompileHandler for ArbGasInfoHandler {
    fn address(&self) -> Address {
        self.address.clone()
    }

    fn name(&self) -> &str {
        "ArbGasInfo"
    }

    fn handle_call(&self, input: &[u8], config: &ArbitrumConfig) -> Result<Vec<u8>> {
        if input.len() < 4 {
            return Err(anyhow!("Input too short for function selector"));
        }

        // Extract function selector (first 4 bytes)
        let selector = &input[0..4];
        let selector_hex = hex::encode(selector);

        match selector_hex.as_str() {
            "c6f7de0e" => self.handle_get_current_tx_l1_gas_fees(input, config), // getCurrentTxL1GasFees()
            "41b247a8" => self.handle_get_prices_in_wei(config),                 // getPricesInWei()
            "f5d6ded7" => self.handle_get_l1_base_fee_estimate(config),         // getL1BaseFeeEstimate()
            _ => Err(anyhow!("Unknown function selector: 0x{}", selector_hex)),
        }
    }

    fn gas_cost(&self, input: &[u8]) -> u64 {
        // Base cost + cost per byte of calldata
        8 + (input.len() as u64 * 16)
    }
}

impl ArbGasInfoHandler {
    /// Handle getCurrentTxL1GasFees() call
    fn handle_get_current_tx_l1_gas_fees(&self, input: &[u8], config: &ArbitrumConfig) -> Result<Vec<u8>> {
        // Calculate L1 gas fees based on calldata size
        let calldata_size = input.len();
        let l1_gas_used = calldata_size as u64 * config.gas_price_components.l1_calldata_cost;
        let l1_gas_fees = l1_gas_used * config.l1_base_fee;

        let fees = U256::from_u64(l1_gas_fees);
        Ok(fees.to_big_endian())
    }

    /// Handle getPricesInWei() call
    fn handle_get_prices_in_wei(&self, config: &ArbitrumConfig) -> Result<Vec<u8>> {
        // Return 5-tuple: (l2BaseFee, l1CalldataCost, l1StorageCost, baseL2GasPrice, congestionFee)
        let mut result = Vec::new();

        // L2 base fee (32 bytes)
        let l2_base_fee = U256::from_u64(config.gas_price_components.l2_base_fee);
        result.extend_from_slice(&l2_base_fee.to_big_endian());

        // L1 calldata cost (32 bytes)
        let l1_calldata_cost = U256::from_u64(config.gas_price_components.l1_calldata_cost);
        result.extend_from_slice(&l1_calldata_cost.to_big_endian());

        // L1 storage cost (32 bytes)
        let l1_storage_cost = U256::from_u64(config.gas_price_components.l1_storage_cost);
        result.extend_from_slice(&l1_storage_cost.to_big_endian());

        // Base L2 gas price (32 bytes)
        let base_l2_gas_price = U256::from_u64(config.gas_price_components.l2_base_fee);
        result.extend_from_slice(&base_l2_gas_price.to_big_endian());

        // Congestion fee (32 bytes)
        let congestion_fee = U256::from_u64(config.gas_price_components.congestion_fee);
        result.extend_from_slice(&congestion_fee.to_big_endian());

        Ok(result)
    }

    /// Handle getL1BaseFeeEstimate() call
    fn handle_get_l1_base_fee_estimate(&self, config: &ArbitrumConfig) -> Result<Vec<u8>> {
        let l1_base_fee = U256::from_u64(config.l1_base_fee);
        Ok(l1_base_fee.to_big_endian())
    }
}

/// Precompile registry
pub struct PrecompileRegistry {
    handlers: Vec<Box<dyn PrecompileHandler>>,
}

impl PrecompileRegistry {
    pub fn new() -> Self {
        Self {
            handlers: Vec::new(),
        }
    }

    /// Register a precompile handler
    pub fn register(&mut self, handler: Box<dyn PrecompileHandler>) {
        self.handlers.push(handler);
    }

    /// Get a precompile handler by address
    pub fn get_handler(&self, address: &Address) -> Option<&dyn PrecompileHandler> {
        self.handlers.iter().find(|h| h.address() == *address).map(|h| h.as_ref())
    }

    /// Check if an address has a precompile handler
    pub fn has_handler(&self, address: &Address) -> bool {
        self.handlers.iter().any(|h| h.address() == *address)
    }

    /// Get all registered precompile addresses
    pub fn get_addresses(&self) -> Vec<Address> {
        self.handlers.iter().map(|h| h.address()).collect()
    }

    /// Handle a precompile call
    pub fn handle_call(&self, address: Address, input: &[u8], config: &ArbitrumConfig) -> Result<Vec<u8>> {
        if let Some(handler) = self.get_handler(&address) {
            handler.handle_call(input, config)
        } else {
            Err(anyhow!("No precompile handler found for address {}", address))
        }
    }
}

impl Default for PrecompileRegistry {
    fn default() -> Self {
        let mut registry = Self::new();
        
        // Register default precompiles
        registry.register(Box::new(ArbSysHandler::new()));
        registry.register(Box::new(ArbGasInfoHandler::new()));
        
        registry
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_address_from_hex() {
        let addr = Address::from_hex("0x1234567890123456789012345678901234567890").unwrap();
        assert_eq!(addr.as_bytes()[0], 0x12);
        assert_eq!(addr.as_bytes()[19], 0x90);
    }

    #[test]
    fn test_u256_from_u64() {
        let value = U256::from_u64(255);
        let bytes = value.to_big_endian();
        assert_eq!(bytes[31], 255);
    }

    #[test]
    fn test_arbsys_handler() {
        let handler = ArbSysHandler::new();
        assert_eq!(handler.name(), "ArbSys");
        assert_eq!(handler.address(), Address::from_hex("0x0000000000000000000000000000000000000064").unwrap());
    }

    #[test]
    fn test_arbgasinfo_handler() {
        let handler = ArbGasInfoHandler::new();
        assert_eq!(handler.name(), "ArbGasInfo");
        assert_eq!(handler.address(), Address::from_hex("0x000000000000000000000000000000000000006c").unwrap());
    }

    #[test]
    fn test_precompile_registry() {
        let registry = PrecompileRegistry::default();
        assert!(registry.has_handler(&Address::from_hex("0x0000000000000000000000000000000000000064").unwrap()));
        assert!(registry.has_handler(&Address::from_hex("0x000000000000000000000000000000000000006c").unwrap()));
        assert!(!registry.has_handler(&Address::from_hex("0x0000000000000000000000000000000000000000").unwrap()));
    }

    #[test]
    fn test_arbsys_calls() {
        let handler = ArbSysHandler::new();
        let config = ArbitrumConfig::new(42161, 20, 20_000_000_000);

        // Test arbChainID()
        let input = hex::decode("a3b1b31d").unwrap();
        let result = handler.handle_call(&input, &config).unwrap();
        let chain_id = U256::from_big_endian(&result);
        assert_eq!(chain_id, U256::from_u64(42161));

        // Test arbOSVersion()
        let input = hex::decode("4d2301cc").unwrap();
        let result = handler.handle_call(&input, &config).unwrap();
        let version = U256::from_big_endian(&result);
        assert_eq!(version, U256::from_u64(20));
    }

    #[test]
    fn test_arbgasinfo_calls() {
        let handler = ArbGasInfoHandler::new();
        let config = ArbitrumConfig::new(42161, 20, 20_000_000_000);

        // Test getCurrentTxL1GasFees()
        let input = hex::decode("4d2301cc").unwrap();
        let result = handler.handle_call(&input, &config).unwrap();
        let base_fee = U256::from_big_endian(&result);
        assert_eq!(base_fee, U256::from_u64(1_280_000_000_000));
    }
}
