//! Arbitrum precompile implementations for Anvil

use crate::arbitrum::ArbitrumConfig;
use anyhow::{anyhow, Result};

/// Simple address type (20 bytes)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
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
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
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

    fn max_value() -> Self {
        Self([0xff; 32])
    }

    // --- Math Implementations ---

    pub fn saturating_add(&self, other: Self) -> Self {
        let (res, overflow) = self.overflowing_add(other);
        if overflow {
            Self::max_value()
        } else {
            res
        }
    }

    pub fn saturating_mul(&self, other: Self) -> Self {
        let a_limbs = self.to_u64_limbs();
        let b_limbs = other.to_u64_limbs();

        // 4x4 limb multiplication
        let mut res_limbs = [0u64; 8];

        for i in 0..4 {
            let mut carry = 0u64;
            for j in 0..4 {
                let product = (a_limbs[i] as u128) * (b_limbs[j] as u128);
                let sum = (res_limbs[i + j] as u128) + product + (carry as u128);
                
                res_limbs[i + j] = sum as u64; // Low part
                carry = (sum >> 64) as u64;    // High part
            }
            res_limbs[i + 4] += carry;
        }


        if res_limbs[4..8].iter().any(|&x| x != 0) {
            return Self::max_value();
        }

        Self::from_u64_limbs(&res_limbs[0..4])
    }

    // --- Internal Helpers ---

    fn overflowing_add(&self, other: Self) -> (Self, bool) {
        let mut result = [0u8; 32];
        let mut carry = 0u16;

        for i in (0..32).rev() {
            let sum = (self.0[i] as u16) + (other.0[i] as u16) + carry;
            result[i] = (sum & 0xff) as u8;
            carry = sum >> 8;
        }

        (Self(result), carry > 0)
    }

    fn to_u64_limbs(&self) -> [u64; 4] {
        let mut limbs = [0u64; 4];
        for i in 0..4 {
            let start = 24 - (i * 8);
            let end = 32 - (i * 8);
            let mut chunk = [0u8; 8];
            chunk.copy_from_slice(&self.0[start..end]);
            limbs[i] = u64::from_be_bytes(chunk);
        }
        limbs
    }

    fn from_u64_limbs(limbs: &[u64]) -> Self {
        let mut bytes = [0u8; 32];
        for i in 0..4 {
            let chunk = limbs[i].to_be_bytes();
            let start = 24 - (i * 8);
            let end = 32 - (i * 8);
            bytes[start..end].copy_from_slice(&chunk);
        }
        Self(bytes)
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


//  Struct to hold the accounting parameters internally
struct GasAccountingParams {
    speed_limit_per_second: u64,
    gas_pool_max: u64,
    max_tx_gas_limit: u64,
    amortized_cost_cap_bips: u64,
}


/// ArbGasInfo precompile handler (0x6C)
pub struct ArbGasInfoHandler {
    address: Address,
    accounting_params: GasAccountingParams, 
}



impl ArbGasInfoHandler {
    pub fn new() -> Self {
        Self {
            address: Address::from_hex("0x000000000000000000000000000000000000006c").unwrap(),
            accounting_params: GasAccountingParams {
                speed_limit_per_second: 120_000_000,
                gas_pool_max: 32_000_000,
                max_tx_gas_limit: 32_000_000,
                amortized_cost_cap_bips: 10_000,
            },
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

        let selector = &input[0..4];
        let selector_hex = hex::encode(selector);

        match selector_hex.as_str() {
            // --- Standard Getters ---
            "c6f7de0e" => self.handle_get_current_tx_l1_gas_fees(input, config),
            "41b247a8" => self.handle_get_prices_in_wei(config),
            "f5d6ded7" => self.handle_get_l1_base_fee_estimate(config),
            "02199f34" => self.handle_get_prices_in_arb_gas(config), 
            "b246b565" => self.handle_get_l2_base_fee_estimate(config),
            "055f362f" => self.handle_get_l1_gas_price_estimate(config),
            "612af178" => self.handle_get_gas_accounting_params(),
            "f918379a" => self.handle_get_minimum_gas_price(config),
            "7a7d6beb" => self.handle_get_amortized_cost_cap_bips(),
            "67037bec" => self.handle_get_l1_blob_base_fee_estimate(config),
            "43a28b2e" => self.handle_get_prices_in_wei(config),   // getPricesInWeiWithAggregator
            "12f78baa" => self.handle_get_prices_in_arb_gas(config), // getPricesInArbGasWithAggregator

            _ => Err(anyhow!("Unknown function selector: 0x{}", selector_hex)),
        }
    }
    fn gas_cost(&self, input: &[u8]) -> u64 {
        if input.len() < 4 { return 0; }
        
        let selector = hex::encode(&input[0..4]);
        
        match selector.as_str() {
            "41b247a8" => 10, // getPricesInWei
            "f5d6ded7" => 5,  // getL1BaseFeeEstimate
            "02199f34" => 96, // getPricesInArbGas
            "612af178" => 20, // getGasAccountingParams (returns 3 words)
            "43a28b2e" => 20, // getPricesInWeiWithAggregator
            "12f78baa" => 20, // getPricesInArbGasWithAggregator
            
            
            "b246b565" | "055f362f" | "f918379a" | "7a7d6beb" | "67037bec" => 10,
            
            _ => 0,
        }
    }
}

impl ArbGasInfoHandler {
    /// Handle getCurrentTxL1GasFees() call
    ///  Uses compression heuristic (0-byte discount)
    fn handle_get_current_tx_l1_gas_fees(&self, input: &[u8], config: &ArbitrumConfig) -> Result<Vec<u8>> {
        //  Analyze input for Zero vs Non-Zero bytes
        let mut non_zero_bytes = 0u64;
        let mut zero_bytes = 0u64;

        for &byte in input {
            if byte == 0 {
                zero_bytes += 1;
            } else {
                non_zero_bytes += 1;
            }
        }

        // Apply Heuristic Costing
        // Cost per non-zero is standard L1 calldata cost (usually 16)
        let cost_per_non_zero = config.gas_price_components.l1_calldata_cost; 
        // Cost per zero is standard EVM (4 gas)
        let cost_per_zero = 4u64;

        let raw_gas = (non_zero_bytes * cost_per_non_zero) + (zero_bytes * cost_per_zero);

        // Apply Compression Discount (0.9x)
        // using integer math: (raw * 9) / 10
        let l1_gas_used = (raw_gas * 9) / 10;
        
        let l1_gas_fees = l1_gas_used * config.l1_base_fee;

        let fees = U256::from_u64(l1_gas_fees);
        Ok(fees.to_big_endian().to_vec())
    }

    
    /// Handle getPricesInWei() call
    fn handle_get_prices_in_wei(&self, config: &ArbitrumConfig) -> Result<Vec<u8>> {
        // Return 6-tuple
        let mut result = Vec::with_capacity(32 * 6);

        // [0] Stub (Legacy L2 Tx)
        let l2_base_fee = U256::from_u64(config.gas_price_components.l2_base_fee);
        result.extend_from_slice(&self.encode_u256(l2_base_fee));

        // [1] Stub (Legacy L1 Calldata)
        let l1_calldata_cost = U256::from_u64(config.gas_price_components.l1_calldata_cost);
        result.extend_from_slice(&self.encode_u256(l1_calldata_cost));

        // [2] L1 Cost Per Byte (Calculated: L1BaseFee * 16)
        let l1_base_fee = U256::from_u64(config.l1_base_fee);
        let l1_byte_price = l1_base_fee.saturating_mul(l1_calldata_cost);
        result.extend_from_slice(&self.encode_u256(l1_byte_price));

        // [3] L2 Base Fee
        result.extend_from_slice(&self.encode_u256(l2_base_fee));

        // [4] Congestion Fee
        let congestion_fee = U256::from_u64(config.gas_price_components.congestion_fee);
        result.extend_from_slice(&self.encode_u256(congestion_fee));

        // [5] Total L2 Fee (L2Base + Congestion)
        let total_l2 = l2_base_fee.saturating_add(congestion_fee);
        result.extend_from_slice(&self.encode_u256(total_l2));

        Ok(result)
    }


    /// Handle getL1BaseFeeEstimate() call
    fn handle_get_l1_base_fee_estimate(&self, config: &ArbitrumConfig) -> Result<Vec<u8>> {
        let l1_base_fee = U256::from_u64(config.l1_base_fee);
        Ok(l1_base_fee.to_big_endian())
    }

    
    /// Handle getL1GasPriceEstimate()
    fn handle_get_l1_gas_price_estimate(&self, config: &ArbitrumConfig) -> Result<Vec<u8>> {
        let fee = U256::from_u64(config.l1_base_fee);
        Ok(self.encode_u256(fee).to_vec())
    }

    /// Handle getMinimumGasPrice()
    fn handle_get_minimum_gas_price(&self, config: &ArbitrumConfig) -> Result<Vec<u8>> {
        let fee = U256::from_u64(config.gas_price_components.l2_base_fee);
        Ok(self.encode_u256(fee).to_vec())
    }

    /// Handle getAmortizedCostCapBips()
    fn handle_get_amortized_cost_cap_bips(&self) -> Result<Vec<u8>> {
        let bips = U256::from_u64(self.accounting_params.amortized_cost_cap_bips);
        Ok(self.encode_u256(bips).to_vec())
    }

    /// Handle getGasAccountingParams()
    fn handle_get_gas_accounting_params(&self) -> Result<Vec<u8>> {
        let mut result = Vec::with_capacity(32 * 3);
        
        let speed = U256::from_u64(self.accounting_params.speed_limit_per_second);
        let pool = U256::from_u64(self.accounting_params.gas_pool_max);
        let max_tx = U256::from_u64(self.accounting_params.max_tx_gas_limit);

        result.extend_from_slice(&self.encode_u256(speed));
        result.extend_from_slice(&self.encode_u256(pool));
        result.extend_from_slice(&self.encode_u256(max_tx));

        Ok(result)
    }


    /// Handle getPricesInArbGas()
    fn handle_get_prices_in_arb_gas(&self, config: &ArbitrumConfig) -> Result<Vec<u8>> {
        let mut result = Vec::with_capacity(32 * 3);
        
        let l2_base_fee = U256::from_u64(config.gas_price_components.l2_base_fee);
        let l1_calldata_cost = U256::from_u64(config.gas_price_components.l1_calldata_cost);
        let l1_storage_cost = U256::from_u64(config.gas_price_components.l1_storage_cost);

        result.extend_from_slice(&self.encode_u256(l2_base_fee));
        result.extend_from_slice(&self.encode_u256(l1_calldata_cost));
        result.extend_from_slice(&self.encode_u256(l1_storage_cost));

        Ok(result)
    }

    /// Handle getL1BlobBaseFeeEstimate()
    fn handle_get_l1_blob_base_fee_estimate(&self, _config: &ArbitrumConfig) -> Result<Vec<u8>> {
        // Return 1 wei (safe non-zero default) or config value if you have it
        Ok(self.encode_u256(U256::from_u64(1)).to_vec())
    }


    ///  Handle getL2BaseFeeEstimate()
    /// Returns the current L2 base fee (same as config value)
    fn handle_get_l2_base_fee_estimate(&self, config: &ArbitrumConfig) -> Result<Vec<u8>> {
        let fee = U256::from_u64(config.gas_price_components.l2_base_fee);
        Ok(self.encode_u256(fee).to_vec())
    }



    // --- Helpers ---

    fn encode_u256(&self, val: U256) -> [u8; 32] {
        let mut bytes = [0u8; 32];
        let vec_data = val.to_big_endian();
        bytes.copy_from_slice(&vec_data);
        bytes
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
        let input = hex::decode("d127f54a").unwrap();
        let result = handler.handle_call(&input, &config).unwrap();
        let chain_id = U256::from_big_endian(&result);
        assert_eq!(chain_id, U256::from_u64(42161));

        // Test arbOSVersion()
        let input = hex::decode("051038f2").unwrap();
        let result = handler.handle_call(&input, &config).unwrap();
        let version = U256::from_big_endian(&result);
        assert_eq!(version, U256::from_u64(20));
    }

    #[test]
    fn test_arbgasinfo_calls() {
        let handler = ArbGasInfoHandler::new();
        let config = ArbitrumConfig::new(42161, 20, 20_000_000_000);

        // Test getCurrentTxL1GasFees()
        let input = hex::decode("c6f7de0e").unwrap();
        let result = handler.handle_call(&input, &config).unwrap();
        let base_fee = U256::from_big_endian(&result);
        assert_eq!(base_fee, U256::from_u64(1_280_000_000_000));
    }
}
