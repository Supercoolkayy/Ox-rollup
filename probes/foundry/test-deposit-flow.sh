#!/bin/bash

# Foundry Probe: Deposit Transaction Flow Testing
# 
# This script tests the support for Arbitrum deposit transactions
# (transaction type 0x7e) in a local Anvil network.
# 
# Usage: ./probes/foundry/test-deposit-flow.sh
# Prerequisites: Foundry installed, Anvil running

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ANVIL_RPC="http://localhost:8545"
CHAIN_ID="42161"  # Arbitrum mainnet chain ID
TEST_ACCOUNT_INDEX=0

echo -e "${BLUE} Starting Deposit Transaction Flow Probe for Foundry Anvil${NC}"
echo "=================================================================="
echo ""

# Function to check if Anvil is running
check_anvil() {
    echo -e "${YELLOW}1. Checking Anvil network status...${NC}"
    
    if curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
        $ANVIL_RPC > /dev/null 2>&1; then
        echo -e "   ${GREEN} Anvil is running at $ANVIL_RPC${NC}"
        
        # Get chain ID
        CHAIN_ID_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
            --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
            $ANVIL_RPC)
        
        ACTUAL_CHAIN_ID=$(echo $CHAIN_ID_RESPONSE | jq -r '.result' 2>/dev/null || echo "unknown")
        echo "    Current chain ID: $ACTUAL_CHAIN_ID"
        
        return 0
    else
        echo -e "   ${RED} Anvil is not running at $ANVIL_RPC${NC}"
        echo "   💡 Start Anvil with: anvil --chain-id $CHAIN_ID"
        return 1
    fi
}

# Function to test precompile accessibility
test_precompiles() {
    echo -e "\n${YELLOW}2. Testing Arbitrum precompile accessibility...${NC}"
    
    # Test ArbSys precompile (0x64)
    echo "    Testing ArbSys precompile (0x64)..."
    ARBSYS_CODE=$(curl -s -X POST -H "Content-Type: application/json" \
        --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getCode\",\"params\":[\"0x0000000000000000000000000000000000000064\",\"latest\"],\"id\":1}" \
        $ANVIL_RPC | jq -r '.result' 2>/dev/null || echo "0x")
    
    if [ "$ARBSYS_CODE" != "0x" ]; then
        echo -e "   ${GREEN} ArbSys precompile is accessible${NC}"
        echo "    Code size: ${#ARBSYS_CODE} characters"
    else
        echo -e "   ${RED} ArbSys precompile not found${NC}"
        echo "   💡 Arbitrum features may not be enabled"
    fi
    
    # Test ArbGasInfo precompile (0x6C)
    echo "    Testing ArbGasInfo precompile (0x6C)..."
    ARBGASINFO_CODE=$(curl -s -X POST -H "Content-Type: application/json" \
        --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getCode\",\"params\":[\"0x000000000000000000000000000000000000006C\",\"latest\"],\"id\":1}" \
        $ANVIL_RPC | jq -r '.result' 2>/dev/null || echo "0x")
    
    if [ "$ARBGASINFO_CODE" != "0x" ]; then
        echo -e "   ${GREEN} ArbGasInfo precompile is accessible${NC}"
        echo "    Code size: ${#ARBGASINFO_CODE} characters"
    else
        echo -e "   ${RED} ArbGasInfo precompile not found${NC}"
        echo "   💡 Arbitrum features may not be enabled"
    fi
}

# Function to test transaction type 0x7e support
test_deposit_transaction() {
    echo -e "\n${YELLOW}3. Testing deposit transaction (0x7e) support...${NC}"
    
    # Get test account address
    echo "    Getting test account address..."
    ACCOUNT_ADDRESS=$(curl -s -X POST -H "Content-Type: application/json" \
        --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_accounts\",\"params\":[],\"id\":1}" \
        $ANVIL_RPC | jq -r ".result[$TEST_ACCOUNT_INDEX]" 2>/dev/null || echo "")
    
    if [ -z "$ACCOUNT_ADDRESS" ]; then
        echo -e "   ${RED} Could not get test account address${NC}"
        return 1
    fi
    
    echo "    Test account: $ACCOUNT_ADDRESS"
    
    # Get account balance
    BALANCE=$(curl -s -X POST -H "Content-Type: application/json" \
        --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"$ACCOUNT_ADDRESS\",\"latest\"],\"id\":1}" \
        $ANVIL_RPC | jq -r '.result' 2>/dev/null || echo "0x0")
    
    BALANCE_ETH=$(printf "%.4f" $(echo "scale=6; $(echo $BALANCE | sed 's/0x//' | tr 'a-f' 'A-F') / 1000000000000000000" | bc -l 2>/dev/null || echo "0"))
    echo "    Account balance: $BALANCE_ETH ETH"
    
    # Test sending a transaction with type 0x7e
    echo "    Testing transaction type 0x7e..."
    
    # Create a mock deposit transaction
    DEPOSIT_TX='{
        "jsonrpc": "2.0",
        "method": "eth_sendTransaction",
        "params": [{
            "type": "0x7e",
            "from": "'$ACCOUNT_ADDRESS'",
            "to": "0x1234567890123456789012345678901234567890",
            "value": "0x16345785d8a0000",
            "gas": "0x5208"
        }],
        "id": 1
    }'
    
    # Try to send the transaction
    TX_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
        --data "$DEPOSIT_TX" \
        $ANVIL_RPC)
    
    TX_ERROR=$(echo $TX_RESPONSE | jq -r '.error.message' 2>/dev/null || echo "")
    TX_HASH=$(echo $TX_RESPONSE | jq -r '.result' 2>/dev/null || echo "")
    
    if [ -n "$TX_HASH" ] && [ "$TX_HASH" != "null" ]; then
        echo -e "   ${GREEN} Transaction type 0x7e accepted!${NC}"
        echo "    Transaction hash: $TX_HASH"
        return 0
    else
        echo -e "   ${RED} Transaction type 0x7e not supported${NC}"
        if [ -n "$TX_ERROR" ]; then
            echo "    Error: $TX_ERROR"
        fi
        echo "   💡 This confirms that deposit transactions are not yet implemented"
        return 1
    fi
}

# Function to test RPC compatibility
test_rpc_compatibility() {
    echo -e "\n${YELLOW}4. Testing RPC compatibility for deposit transactions...${NC}"
    
    # Test eth_sendRawTransaction with 0x7e transaction
    echo "    Testing eth_sendRawTransaction..."
    
    # Create a mock raw transaction (this won't work without 0x7e support)
    MOCK_RAW_TX="0x7e$(openssl rand -hex 64)"
    
    RAW_TX_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
        --data "{\"jsonrpc\":\"2.0\",\"method\":\"eth_sendRawTransaction\",\"params\":[\"$MOCK_RAW_TX\"],\"id\":1}" \
        $ANVIL_RPC)
    
    RAW_TX_ERROR=$(echo $RAW_TX_RESPONSE | jq -r '.error.message' 2>/dev/null || echo "")
    RAW_TX_RESULT=$(echo $RAW_TX_RESPONSE | jq -r '.result' 2>/dev/null || echo "")
    
    if [ -n "$RAW_TX_RESULT" ] && [ "$RAW_TX_RESULT" != "null" ]; then
        echo -e "   ${GREEN} eth_sendRawTransaction accepted 0x7e transaction${NC}"
        echo "    Result: $RAW_TX_RESULT"
        return 0
    else
        echo -e "   ${RED} eth_sendRawTransaction rejected 0x7e transaction${NC}"
        if [ -n "$RAW_TX_ERROR" ]; then
            echo "    Error: $RAW_TX_ERROR"
        fi
        echo "   💡 RPC layer doesn't support deposit transactions"
        return 1
    fi
}

# Function to test gas estimation
test_gas_estimation() {
    echo -e "\n${YELLOW}5. Testing gas estimation for deposit transactions...${NC}"
    
    # Test gas estimation for a 0x7e transaction
    echo "    Testing gas estimation..."
    
    GAS_ESTIMATE_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" \
        --data '{
            "jsonrpc": "2.0",
            "method": "eth_estimateGas",
            "params": [{
                "type": "0x7e",
                "from": "0x1234567890123456789012345678901234567890",
                "to": "0x0987654321098765432109876543210987654321",
                "value": "0x0"
            }],
            "id": 1
        }' \
        $ANVIL_RPC)
    
    GAS_ESTIMATE_ERROR=$(echo $GAS_ESTIMATE_RESPONSE | jq -r '.error.message' 2>/dev/null || echo "")
    GAS_ESTIMATE_RESULT=$(echo $GAS_ESTIMATE_RESPONSE | jq -r '.result' 2>/dev/null || echo "")
    
    if [ -n "$GAS_ESTIMATE_RESULT" ] && [ "$GAS_ESTIMATE_RESULT" != "null" ]; then
        echo -e "   ${GREEN} Gas estimation successful for 0x7e transaction${NC}"
        GAS_ESTIMATE_DECIMAL=$(printf "%d" $GAS_ESTIMATE_RESULT)
        echo "    Estimated gas: $GAS_ESTIMATE_DECIMAL"
        return 0
    else
        echo -e "   ${RED} Gas estimation failed for 0x7e transaction${NC}"
        if [ -n "$GAS_ESTIMATE_ERROR" ]; then
            echo "    Error: $GAS_ESTIMATE_ERROR"
        fi
        echo "   💡 Gas estimation doesn't support deposit transactions"
        return 1
    fi
}

# Function to run Foundry tests
run_foundry_tests() {
    echo -e "\n${YELLOW}6. Running Foundry test suite...${NC}"
    
    if command -v forge >/dev/null 2>&1; then
        echo "   🔨 Foundry detected, running tests..."
        
        # Check if we're in a Foundry project
        if [ -f "foundry.toml" ]; then
            echo "    Foundry project detected"
            
            # Run the Arbitrum precompile tests
            echo "    Running Arbitrum precompile tests..."
            forge test --match-contract ArbitrumPrecompileTest -vvv || {
                echo -e "   ${YELLOW} Some tests failed (expected without Arbitrum support)${NC}"
            }
        else
            echo "    Not in a Foundry project directory"
            echo "   💡 Navigate to a Foundry project or create one with: forge init"
        fi
    else
        echo "    Foundry not installed"
        echo "   💡 Install Foundry: curl -L https://foundry.paradigm.xyz | bash"
    fi
}

# Function to generate summary
generate_summary() {
    echo -e "\n${BLUE}==================================================================${NC}"
    echo -e "${BLUE} DEPOSIT TRANSACTION FLOW PROBE RESULTS SUMMARY${NC}"
    echo -e "${BLUE}==================================================================${NC}"
    
    # Count successful tests
    SUCCESS_COUNT=0
    TOTAL_TESTS=5
    
    if [ $ANVIL_RUNNING -eq 1 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
    if [ $PRECOMPILES_ACCESSIBLE -eq 1 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
    if [ $DEPOSIT_TX_SUPPORTED -eq 1 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
    if [ $RPC_COMPATIBLE -eq 1 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
    if [ $GAS_ESTIMATION_WORKS -eq 1 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
    
    echo "Anvil Network Status:     $([ $ANVIL_RUNNING -eq 1 ] && echo " RUNNING" || echo " NOT RUNNING")"
    echo "Precompiles Accessible:   $([ $PRECOMPILES_ACCESSIBLE -eq 1 ] && echo " ACCESSIBLE" || echo " NOT ACCESSIBLE")"
    echo "Deposit Transaction:      $([ $DEPOSIT_TX_SUPPORTED -eq 1 ] && echo " SUPPORTED" || echo " NOT SUPPORTED")"
    echo "RPC Compatibility:        $([ $RPC_COMPATIBLE -eq 1 ] && echo " COMPATIBLE" || echo " NOT COMPATIBLE")"
    echo "Gas Estimation:           $([ $GAS_ESTIMATION_WORKS -eq 1 ] && echo " WORKING" || echo " NOT WORKING")"
    
    echo ""
    echo "Total Features Working: $SUCCESS_COUNT/$TOTAL_TESTS"
    echo "Success Rate: $((SUCCESS_COUNT * 100 / TOTAL_TESTS))%"
    
    if [ $SUCCESS_COUNT -eq 0 ]; then
        echo -e "\n${YELLOW}💡 To enable Arbitrum features in Anvil:${NC}"
        echo "   1. Fork Anvil repository or create patch"
        echo "   2. Add precompiles to revm precompile map"
        echo "   3. Extend transaction type parsing for 0x7e"
        echo "   4. Rebuild and run custom Anvil instance"
    elif [ $SUCCESS_COUNT -eq $TOTAL_TESTS ]; then
        echo -e "\n${GREEN} Full Arbitrum support is working in Anvil!${NC}"
    else
        echo -e "\n${YELLOW} Partial Arbitrum support detected${NC}"
        echo "   Some features work, but full 0x7e support requires implementation"
    fi
    
    echo -e "\n${BLUE}==================================================================${NC}"
}

# Main execution
main() {
    # Initialize test result variables
    ANVIL_RUNNING=0
    PRECOMPILES_ACCESSIBLE=0
    DEPOSIT_TX_SUPPORTED=0
    RPC_COMPATIBLE=0
    GAS_ESTIMATION_WORKS=0
    
    # Run tests
    if check_anvil; then
        ANVIL_RUNNING=1
        test_precompiles && PRECOMPILES_ACCESSIBLE=1
        test_deposit_transaction && DEPOSIT_TX_SUPPORTED=1
        test_rpc_compatibility && RPC_COMPATIBLE=1
        test_gas_estimation && GAS_ESTIMATION_WORKS=1
        run_foundry_tests
    fi
    
    # Generate summary
    generate_summary
}

# Check dependencies
if ! command -v jq >/dev/null 2>&1; then
    echo -e "${RED} jq is required but not installed${NC}"
    echo "Install with: sudo apt-get install jq (Ubuntu/Debian) or brew install jq (macOS)"
    exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
    echo -e "${RED} curl is required but not installed${NC}"
    exit 1
fi

# Run main function
main "$@"
