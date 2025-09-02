//! CLI argument parsing for Anvil with Arbitrum extensions

use clap::Parser;

/// Anvil with Arbitrum precompile support and 0x7e transaction parsing
#[derive(Parser, Debug)]
#[command(
    name = "anvil-arbitrum",
    about = "Anvil with Arbitrum precompile support and 0x7e transaction parsing",
    disable_help_flag = true
)]
pub struct AnvilArbitrumArgs {
    /// Enable Arbitrum precompile support and 0x7e transaction parsing
    #[arg(long = "arbitrum", default_value = "false")]
    pub arbitrum: bool,

    /// Arbitrum chain ID
    #[arg(long = "arb-chain-id", default_value = "42161")]
    pub chain_id: Option<u64>,

    /// ArbOS version
    #[arg(long = "arb-os-version", default_value = "20")]
    pub arb_os_version: Option<u32>,

    /// L1 base fee in wei
    #[arg(long = "l1-base-fee", default_value = "20000000000")]
    pub l1_base_fee: Option<u64>,

    /// Gas price configuration (JSON string)
    #[arg(long = "gas-config")]
    pub gas_config: Option<String>,

    /// Enable 0x7e transaction processing
    #[arg(long = "enable-tx7e", default_value = "false")]
    pub enable_tx7e: bool,

    /// Mock L1 bridge for testing
    #[arg(long = "mock-l1-bridge", default_value = "false")]
    pub mock_l1_bridge: bool,

    // Standard Anvil arguments (forwarded)
    /// Host to bind to
    #[arg(long = "host", default_value = "127.0.0.1")]
    pub host: String,

    /// Port to bind to
    #[arg(long = "port", default_value = "8545")]
    pub port: u16,

    /// Number of accounts to generate
    #[arg(long = "accounts", default_value = "10")]
    pub accounts: u32,

    /// Balance of each account in ETH
    #[arg(long = "balance", default_value = "10000")]
    pub balance: u64,

    /// Gas limit
    #[arg(long = "gas-limit", default_value = "30000000")]
    pub gas_limit: u64,

    /// Gas price
    #[arg(long = "gas-price", default_value = "20000000000")]
    pub gas_price: u64,

    /// Block time in seconds
    #[arg(long = "block-time", default_value = "0")]
    pub block_time: u64,

    /// Chain ID
    #[arg(long = "chain-id", default_value = "31337")]
    pub anvil_chain_id: u64,

    /// Base fee
    #[arg(long = "base-fee", default_value = "1000000000")]
    pub base_fee: u64,

    /// Timestamp for the genesis block
    #[arg(long = "timestamp")]
    pub timestamp: Option<u64>,

    /// Fork from a remote endpoint
    #[arg(long = "fork")]
    pub fork: Option<String>,

    /// Fork block number
    #[arg(long = "fork-block-number")]
    pub fork_block_number: Option<u64>,

    /// No mining
    #[arg(long = "no-mining", default_value = "false")]
    pub no_mining: bool,

    /// Silent mode
    #[arg(long = "silent", default_value = "false")]
    pub silent: bool,

    /// Verbose output
    #[arg(long = "verbose", default_value = "false")]
    pub verbose: bool,

    /// Show help
    #[arg(long = "help", short = 'h')]
    pub help: bool,
}

impl AnvilArbitrumArgs {
    /// Get the standard Anvil arguments as a vector
    pub fn get_anvil_args(&self) -> Vec<String> {
        let mut args = Vec::new();
        
        args.push(format!("--host={}", self.host));
        args.push(format!("--port={}", self.port));
        args.push(format!("--accounts={}", self.accounts));
        args.push(format!("--balance={}", self.balance));
        args.push(format!("--gas-limit={}", self.gas_limit));
        args.push(format!("--gas-price={}", self.gas_price));
        args.push(format!("--block-time={}", self.block_time));
        args.push(format!("--chain-id={}", self.anvil_chain_id));
        args.push(format!("--base-fee={}", self.base_fee));
        
        if let Some(timestamp) = self.timestamp {
            args.push(format!("--timestamp={}", timestamp));
        }
        
        if let Some(fork) = &self.fork {
            args.push(format!("--fork={}", fork));
        }
        
        if let Some(fork_block_number) = self.fork_block_number {
            args.push(format!("--fork-block-number={}", fork_block_number));
        }
        
        if self.no_mining {
            args.push("--no-mining".to_string());
        }
        
        if self.silent {
            args.push("--silent".to_string());
        }
        
        if self.verbose {
            args.push("--verbose".to_string());
        }
        
        args
    }
}
