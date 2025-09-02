//! Arbitrum 0x7e transaction type implementation for Anvil

use crate::precompiles::{Address, U256};
use anyhow::{anyhow, Result};
use rlp::{Decodable, DecoderError, Encodable, Rlp, RlpStream};
use sha3::{Digest, Keccak256};

/// Transaction type for Arbitrum deposit transactions
pub const TX_TYPE_0X7E: u8 = 0x7e;

/// Arbitrum deposit transaction (0x7e)
#[derive(Debug, Clone, PartialEq)]
pub struct Tx7eTransaction {
    /// Chain ID
    pub chain_id: u64,
    /// Target address
    pub target: Address,
    /// Value in wei
    pub value: U256,
    /// Calldata
    pub data: Vec<u8>,
    /// Gas limit
    pub gas_limit: u64,
    /// L1 block number
    pub l1_block_number: u64,
    /// L1 timestamp
    pub l1_timestamp: u64,
    /// L1 base fee
    pub l1_base_fee: U256,
    /// L1 gas price
    pub l1_gas_price: U256,
    /// L1 gas used
    pub l1_gas_used: u64,
    /// L1 fee
    pub l1_fee: U256,
    /// Refund address
    pub refund_address: Address,
    /// Source hash
    pub source_hash: [u8; 32],
}

impl Tx7eTransaction {
    /// Create a new deposit transaction
    pub fn new(
        chain_id: u64,
        target: Address,
        value: U256,
        data: Vec<u8>,
        gas_limit: u64,
        l1_block_number: u64,
        l1_timestamp: u64,
        l1_base_fee: U256,
        l1_gas_price: U256,
        l1_gas_used: u64,
        l1_fee: U256,
        refund_address: Address,
        source_hash: [u8; 32],
    ) -> Self {
        Self {
            chain_id,
            target,
            value,
            data,
            gas_limit,
            l1_block_number,
            l1_timestamp,
            l1_base_fee,
            l1_gas_price,
            l1_gas_used,
            l1_fee,
            refund_address,
            source_hash,
        }
    }

    /// Get the transaction hash
    pub fn hash(&self) -> [u8; 32] {
        let encoded = self.rlp_encode();
        let mut hasher = Keccak256::new();
        hasher.update(&encoded);
        hasher.finalize().into()
    }

    /// RLP encode the transaction
    pub fn rlp_encode(&self) -> Vec<u8> {
        let mut stream = RlpStream::new();
        self.rlp_append(&mut stream);
        stream.out().to_vec()
    }

    /// Get the total L1 cost
    pub fn total_l1_cost(&self) -> U256 {
        self.l1_fee.clone()
    }

    /// Get the effective gas price
    pub fn effective_gas_price(&self) -> U256 {
        if self.l1_gas_used == 0 {
            return U256::zero();
        }
        
        let _total_cost = self.l1_fee.clone();
        let gas_used = U256::from_u64(self.l1_gas_used);
        
        // Simple division (in a real implementation, this would be more sophisticated)
        if gas_used == U256::zero() {
            U256::zero()
        } else {
            // For simplicity, return the L1 base fee
            self.l1_base_fee.clone()
        }
    }
}

impl Encodable for Tx7eTransaction {
    fn rlp_append(&self, s: &mut RlpStream) {
        s.begin_list(13);
        s.append(&self.chain_id);
        s.append(&self.target.as_bytes().to_vec());
        s.append(&self.value.to_big_endian());
        s.append(&self.data);
        s.append(&self.gas_limit);
        s.append(&self.l1_block_number);
        s.append(&self.l1_timestamp);
        s.append(&self.l1_base_fee.to_big_endian());
        s.append(&self.l1_gas_price.to_big_endian());
        s.append(&self.l1_gas_used);
        s.append(&self.l1_fee.to_big_endian());
        s.append(&self.refund_address.as_bytes().to_vec());
        s.append(&self.source_hash.to_vec());
    }
}

impl Decodable for Tx7eTransaction {
    fn decode(rlp: &Rlp) -> Result<Self, DecoderError> {
        if rlp.item_count()? != 13 {
            return Err(DecoderError::RlpIncorrectListLen);
        }

        let chain_id: u64 = rlp.val_at(0)?;
        let target_bytes: Vec<u8> = rlp.val_at(1)?;
        let value_bytes: Vec<u8> = rlp.val_at(2)?;
        let data: Vec<u8> = rlp.val_at(3)?;
        let gas_limit: u64 = rlp.val_at(4)?;
        let l1_block_number: u64 = rlp.val_at(5)?;
        let l1_timestamp: u64 = rlp.val_at(6)?;
        let l1_base_fee_bytes: Vec<u8> = rlp.val_at(7)?;
        let l1_gas_price_bytes: Vec<u8> = rlp.val_at(8)?;
        let l1_gas_used: u64 = rlp.val_at(9)?;
        let l1_fee_bytes: Vec<u8> = rlp.val_at(10)?;
        let refund_address_bytes: Vec<u8> = rlp.val_at(11)?;
        let source_hash: Vec<u8> = rlp.val_at(12)?;

        // Validate and convert bytes to proper types
        if target_bytes.len() != 20 {
            return Err(DecoderError::Custom("Invalid target address length"));
        }
        if refund_address_bytes.len() != 20 {
            return Err(DecoderError::Custom("Invalid refund address length"));
        }
        if source_hash.len() != 32 {
            return Err(DecoderError::Custom("Invalid source hash length"));
        }

        let target = Address::new(target_bytes.try_into().unwrap());
        let refund_address = Address::new(refund_address_bytes.try_into().unwrap());
        let source_hash_array: [u8; 32] = source_hash.try_into().unwrap();

        let value = U256::from_big_endian(&value_bytes);
        let l1_base_fee = U256::from_big_endian(&l1_base_fee_bytes);
        let l1_gas_price = U256::from_big_endian(&l1_gas_price_bytes);
        let l1_fee = U256::from_big_endian(&l1_fee_bytes);

        Ok(Self {
            chain_id,
            target,
            value,
            data,
            gas_limit,
            l1_block_number,
            l1_timestamp,
            l1_base_fee,
            l1_gas_price,
            l1_gas_used,
            l1_fee,
            refund_address,
            source_hash: source_hash_array,
        })
    }
}

/// Transaction parser for 0x7e transactions
pub struct Tx7eParser;

impl Tx7eParser {
    /// Parse raw transaction bytes
    pub fn parse(&self, raw_tx: &[u8]) -> Result<Tx7eTransaction> {
        if raw_tx.is_empty() {
            return Err(anyhow!("Empty transaction data"));
        }

        if raw_tx[0] != TX_TYPE_0X7E {
            return Err(anyhow!("Invalid transaction type: expected 0x7e, got 0x{:02x}", raw_tx[0]));
        }

        let rlp_data = &raw_tx[1..];
        let rlp = Rlp::new(rlp_data);
        
        Tx7eTransaction::decode(&rlp)
            .map_err(|e| anyhow!("RLP decoding failed: {:?}", e))
    }

    /// Validate a parsed transaction
    pub fn validate_transaction(&self, tx: &Tx7eTransaction) -> TransactionValidation {
        let mut errors = Vec::new();

        // Check chain ID
        if tx.chain_id == 0 {
            errors.push("Invalid chain ID: cannot be zero".to_string());
        }

        // Check target address
        if *tx.target.as_bytes() == [0u8; 20] {
            errors.push("Invalid target address: cannot be zero address".to_string());
        }

        // Check gas limit
        if tx.gas_limit == 0 {
            errors.push("Invalid gas limit: cannot be zero".to_string());
        }

        // Check L1 block number
        if tx.l1_block_number == 0 {
            errors.push("Invalid L1 block number: cannot be zero".to_string());
        }

        // Check L1 timestamp
        if tx.l1_timestamp == 0 {
            errors.push("Invalid L1 timestamp: cannot be zero".to_string());
        }

        // Check L1 base fee
        if tx.l1_base_fee == U256::zero() {
            errors.push("Invalid L1 base fee: cannot be zero".to_string());
        }

        // Check source hash
        if tx.source_hash == [0u8; 32] {
            errors.push("Invalid source hash: cannot be zero".to_string());
        }

        TransactionValidation {
            isValid: errors.is_empty(),
            errors,
        }
    }

    /// Convert to a standard transaction request
    pub fn to_transaction_request(&self, tx: &Tx7eTransaction) -> TransactionRequest {
        TransactionRequest {
            to: Some(tx.target.clone()),
            value: Some(tx.value.clone()),
            data: Some(tx.data.clone()),
            gas: Some(tx.gas_limit),
            gas_price: Some(tx.effective_gas_price()),
            nonce: None,
            chain_id: Some(tx.chain_id),
        }
    }

    /// Generate source hash from L1 transaction data
    pub fn generate_source_hash(
        &self,
        l1_tx_hash: &[u8; 32],
        l1_block_number: u64,
        l1_log_index: u64,
    ) -> [u8; 32] {
        let mut hasher = Keccak256::new();
        hasher.update(l1_tx_hash);
        hasher.update(&l1_block_number.to_be_bytes());
        hasher.update(&l1_log_index.to_be_bytes());
        hasher.finalize().into()
    }
}

/// Transaction validation result
#[derive(Debug)]
pub struct TransactionValidation {
    pub isValid: bool,
    pub errors: Vec<String>,
}

/// Simple transaction request structure
#[derive(Debug, Clone)]
pub struct TransactionRequest {
    pub to: Option<Address>,
    pub value: Option<U256>,
    pub data: Option<Vec<u8>>,
    pub gas: Option<u64>,
    pub gas_price: Option<U256>,
    pub nonce: Option<u64>,
    pub chain_id: Option<u64>,
}

/// Transaction processor for 0x7e transactions
pub struct Tx7eProcessor {
    parser: Tx7eParser,
}

impl Tx7eProcessor {
    /// Create a new processor
    pub fn new() -> Self {
        Self {
            parser: Tx7eParser,
        }
    }

    /// Process a raw transaction
    pub async fn process_transaction(&self, raw_tx: &[u8]) -> ProcessingResult {
        // Parse the transaction
        let tx = match self.parser.parse(raw_tx) {
            Ok(tx) => tx,
            Err(e) => return ProcessingResult {
                success: false,
                error: format!("Parsing failed: {}", e),
                transaction: None,
                gas_used: 0,
                l1_cost: U256::zero(),
            },
        };

        // Validate the transaction
        let validation = self.parser.validate_transaction(&tx);
        if !validation.isValid {
            return ProcessingResult {
                success: false,
                error: format!("Validation failed: {}", validation.errors.join(", ")),
                transaction: None,
                gas_used: 0,
                l1_cost: U256::zero(),
            };
        }

        // Calculate gas usage (simplified)
        let gas_used = self.calculate_gas_usage(&tx);
        let l1_cost = tx.total_l1_cost();

        ProcessingResult {
            success: true,
            error: String::new(),
            transaction: Some(tx),
            gas_used,
            l1_cost,
        }
    }

    /// Calculate gas usage for the transaction
    fn calculate_gas_usage(&self, tx: &Tx7eTransaction) -> u64 {
        let mut gas = 21000; // Base cost

        // Add cost for data
        if !tx.data.is_empty() {
            gas += tx.data.len() as u64 * 16; // 16 gas per byte
        }

        // Add cost for value transfer
        if tx.value != U256::zero() {
            gas += 9000; // Additional cost for value transfer
        }

        // Ensure we don't exceed the gas limit
        gas.min(tx.gas_limit)
    }
}

impl Default for Tx7eProcessor {
    fn default() -> Self {
        Self::new()
    }
}

/// Result of processing a transaction
#[derive(Debug)]
pub struct ProcessingResult {
    pub success: bool,
    pub error: String,
    pub transaction: Option<Tx7eTransaction>,
    pub gas_used: u64,
    pub l1_cost: U256,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_mock_transaction() -> Tx7eTransaction {
        Tx7eTransaction::new(
            42161, // Arbitrum One chain ID
            Address::from_hex("0x1234567890123456789012345678901234567890").unwrap(),
            U256::from_u64(1000000000000000000), // 1 ETH
            vec![0x60, 0x2b, 0x57, 0xfd], // Some calldata
            100000, // Gas limit
            12345, // L1 block number
            1640995200, // L1 timestamp
            U256::from_u64(20000000000), // L1 base fee
            U256::from_u64(25000000000), // L1 gas price
            50000, // L1 gas used
            U256::from_u64(1000000000000000), // L1 fee
            Address::from_hex("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd").unwrap(),
            [1u8; 32], // Source hash
        )
    }

    #[test]
    fn test_transaction_creation() {
        let tx = create_mock_transaction();
        assert_eq!(tx.chain_id, 42161);
        assert_eq!(tx.gas_limit, 100000);
        assert_eq!(tx.l1_block_number, 12345);
    }

    #[test]
    fn test_transaction_encoding_decoding() {
        let tx = create_mock_transaction();
        let encoded = tx.rlp_encode();
        let decoded = Tx7eTransaction::decode(&Rlp::new(&encoded)).unwrap();
        assert_eq!(tx, decoded);
    }

    #[test]
    fn test_transaction_validation() {
        let parser = Tx7eParser;
        let tx = create_mock_transaction();
        let validation = parser.validate_transaction(&tx);
        assert!(validation.isValid);
        assert!(validation.errors.is_empty());
    }

    #[test]
    fn test_transaction_validation_errors() {
        let parser = Tx7eParser;
        let mut tx = create_mock_transaction();
        tx.chain_id = 0; // Invalid chain ID
        
        let validation = parser.validate_transaction(&tx);
        assert!(!validation.isValid);
        assert!(validation.errors.iter().any(|e| e.contains("chain ID")));
    }

    #[test]
    fn test_transaction_parsing() {
        let parser = Tx7eParser;
        let tx = create_mock_transaction();
        let encoded = tx.rlp_encode();
        let mut raw_tx = vec![TX_TYPE_0X7E];
        raw_tx.extend_from_slice(&encoded);
        
        let parsed = parser.parse(&raw_tx).unwrap();
        assert_eq!(tx, parsed);
    }

    #[test]
    fn test_transaction_parsing_invalid_type() {
        let parser = Tx7eParser;
        let tx = create_mock_transaction();
        let encoded = tx.rlp_encode();
        let mut raw_tx = vec![0x01]; // Wrong transaction type
        raw_tx.extend_from_slice(&encoded);
        
        let result = parser.parse(&raw_tx);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("Invalid transaction type"));
    }

    #[test]
    fn test_transaction_processor() {
        let processor = Tx7eProcessor::new();
        let tx = create_mock_transaction();
        let encoded = tx.rlp_encode();
        let mut raw_tx = vec![TX_TYPE_0X7E];
        raw_tx.extend_from_slice(&encoded);
        
        let result = futures::executor::block_on(processor.process_transaction(&raw_tx));
        assert!(result.success);
        assert!(result.transaction.is_some());
        assert!(result.gas_used > 0);
    }

    #[test]
    fn test_source_hash_generation() {
        let parser = Tx7eParser;
        let l1_tx_hash = [1u8; 32];
        let l1_block_number = 12345;
        let l1_log_index = 0;
        
        let source_hash = parser.generate_source_hash(&l1_tx_hash, l1_block_number, l1_log_index);
        assert_eq!(source_hash.len(), 32);
        assert_ne!(source_hash, [0u8; 32]);
    }

    #[test]
    fn test_transaction_request_conversion() {
        let parser = Tx7eParser;
        let tx = create_mock_transaction();
        let request = parser.to_transaction_request(&tx);
        
        assert_eq!(request.to, Some(tx.target));
        assert_eq!(request.value, Some(tx.value));
        assert_eq!(request.chain_id, Some(tx.chain_id));
    }
}
