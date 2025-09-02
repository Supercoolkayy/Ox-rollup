//! Anvil-Arbitrum: Arbitrum precompile and 0x7e transaction support for Anvil

use crate::arbitrum::ArbitrumConfig;
use crate::cli::AnvilArbitrumArgs;
use crate::precompiles::{Address, PrecompileRegistry, U256};
use crate::tx7e::Tx7eProcessor;
use anyhow::Result;
use clap::Parser;
use tracing::{info, warn};

mod arbitrum;
mod cli;
mod precompiles;
mod tx7e;

#[tokio::main]
async fn main() -> Result<()> {
    // Parse command line arguments
    let args = AnvilArbitrumArgs::parse();

    // Initialize tracing
    tracing_subscriber::fmt::init();

    info!("Starting Anvil-Arbitrum...");

    // Create Arbitrum configuration
    let config = if args.arbitrum {
        ArbitrumConfig::new(
            args.chain_id.unwrap_or(42161),
            args.arb_os_version.unwrap_or(20),
            args.l1_base_fee.unwrap_or(20_000_000_000),
        )
    } else {
        ArbitrumConfig::default()
    };

    info!("Arbitrum configuration: {:?}", config);

    // Demonstrate Arbitrum features
    demonstrate_arbitrum_features(&config, &args).await?;

    // In a real implementation, this would start Anvil with the Arbitrum configuration
    // For now, we just demonstrate the capabilities
    info!("Anvil-Arbitrum demonstration completed successfully");

    Ok(())
}

/// Demonstrate Arbitrum precompile and 0x7e transaction features
async fn demonstrate_arbitrum_features(config: &ArbitrumConfig, args: &AnvilArbitrumArgs) -> Result<()> {
    info!("Demonstrating Arbitrum features...");

    // Initialize precompile registry
    let precompile_registry = PrecompileRegistry::default();
    info!("Precompile registry initialized with {} handlers", precompile_registry.get_addresses().len());

    // Test ArbSys precompile calls
    let arbsys_address = Address::from_hex("0x0000000000000000000000000000000000000064")?;
    if precompile_registry.has_handler(&arbsys_address) {
        info!("Testing ArbSys precompile...");
        
        // Test arbChainID()
        let chain_id_input = hex::decode("a3b1b31d")?;
        match precompile_registry.handle_call(arbsys_address.clone(), &chain_id_input, config) {
            Ok(result) => {
                let chain_id = U256::from_big_endian(&result);
                info!("ArbSys.arbChainID() returned: {}", chain_id);
            }
            Err(e) => warn!("ArbSys.arbChainID() failed: {}", e),
        }

        // Test arbOSVersion()
        let version_input = hex::decode("4d2301cc")?;
        match precompile_registry.handle_call(arbsys_address.clone(), &version_input, config) {
            Ok(result) => {
                let version = U256::from_big_endian(&result);
                info!("ArbSys.arbOSVersion() returned: {}", version);
            }
            Err(e) => warn!("ArbSys.arbOSVersion() failed: {}", e),
        }
    }

    // Test ArbGasInfo precompile calls
    let arbgasinfo_address = Address::from_hex("0x000000000000000000000000000000000000006c")?;
    if precompile_registry.has_handler(&arbgasinfo_address) {
        info!("Testing ArbGasInfo precompile...");
        
        // Test getL1BaseFeeEstimate()
        let base_fee_input = hex::decode("4d2301cc")?;
        match precompile_registry.handle_call(arbgasinfo_address.clone(), &base_fee_input, config) {
            Ok(result) => {
                let base_fee = U256::from_big_endian(&result);
                info!("ArbGasInfo.getL1BaseFeeEstimate() returned: {}", base_fee);
            }
            Err(e) => warn!("ArbGasInfo.getL1BaseFeeEstimate() failed: {}", e),
        }
    }

    // Test 0x7e transaction processing
    if args.enable_tx7e {
        info!("Testing 0x7e transaction processing...");
        
        let processor = Tx7eProcessor::new();
        
        // Create a mock 0x7e transaction
        let mock_tx = create_mock_tx7e_transaction(config)?;
        let encoded = mock_tx.rlp_encode();
        let mut raw_tx = vec![0x7e]; // Transaction type
        raw_tx.extend_from_slice(&encoded);
        
        let result = processor.process_transaction(&raw_tx).await;
        if result.success {
            info!("0x7e transaction processed successfully");
            info!("Gas used: {}", result.gas_used);
            info!("L1 cost: {}", result.l1_cost);
        } else {
            warn!("0x7e transaction processing failed: {}", result.error);
        }
    }

    Ok(())
}

/// Create a mock 0x7e transaction for testing
fn create_mock_tx7e_transaction(config: &ArbitrumConfig) -> Result<crate::tx7e::Tx7eTransaction> {
    use crate::tx7e::Tx7eTransaction;
    
    let target = Address::from_hex("0x1234567890123456789012345678901234567890")?;
    let refund_address = Address::from_hex("0xabcdefabcdefabcdefabcdefabcdefabcdefabcd")?;
    
    Ok(Tx7eTransaction::new(
        config.chain_id,
        target,
        U256::from_u64(1000000000000000000), // 1 ETH
        vec![0x60, 0x2b, 0x57, 0xfd], // Some calldata
        100000, // Gas limit
        12345, // L1 block number
        1640995200, // L1 timestamp
        U256::from_u64(config.l1_base_fee),
        U256::from_u64(25000000000), // L1 gas price
        50000, // L1 gas used
        U256::from_u64(1000000000000000), // L1 fee
        refund_address,
        [1u8; 32], // Source hash
    ))
}
