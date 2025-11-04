/**
 * Soroban Smart Contract Integration
 * Updated to match your actual contract methods: view_pool, swap_a_for_b, swap_b_for_a
 * FIXED: Transaction signing issues
 */

import * as StellarSdk from '@stellar/stellar-sdk'

// Type definitions matching your contract's LiquidityPool struct
export interface LiquidityPoolData {
  token_a_reserve: number
  token_b_reserve: number
  total_swaps: number
}

// Configuration from environment variables
const CONFIG = {
  contractId: import.meta.env.VITE_CONTRACT_ID || 'CDRUJA7RWIJNPD4GHXIPC5PAPKXJKXGYJXZKUQ3HKLNLCXY4JBFZXS3E',
  network: import.meta.env.VITE_STELLAR_NETWORK || 'testnet',
  rpcUrl: import.meta.env.VITE_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org',
  testSecretKey: import.meta.env.VITE_TEST_SECRET_KEY || '',
}

// Initialize Stellar Server for Soroban RPC calls
const server = new StellarSdk.SorobanRpc.Server(CONFIG.rpcUrl)

// Get the network passphrase
const getNetworkPassphrase = (): string => {
  if (CONFIG.network === 'testnet') {
    return StellarSdk.Networks.TESTNET
  } else if (CONFIG.network === 'futurenet') {
    return StellarSdk.Networks.FUTURENET
  } else {
    return StellarSdk.Networks.STANDALONE
  }
}

/**
 * Get a Stellar account keypair for signing transactions
 * FOR LOCAL TESTING ONLY
 */
function getTestKeypair(): StellarSdk.Keypair {
  if (!CONFIG.testSecretKey) {
    throw new Error(
      'No test secret key found in .env. ' +
      'Get a testnet account from: https://laboratory.stellar.org/#account-creator?network=test'
    )
  }
  return StellarSdk.Keypair.fromSecret(CONFIG.testSecretKey)
}

/**
 * Fetch pool reserves using your contract's view_pool method
 * This matches your Rust contract: pub fn view_pool(env: Env) -> LiquidityPool
 */
export async function getPoolReserves(): Promise<LiquidityPoolData> {
  try {
    const contract = new StellarSdk.Contract(CONFIG.contractId)
    const sourceKeypair = getTestKeypair()
    const account = await server.getAccount(sourceKeypair.publicKey())

    // Build transaction to call view_pool (your actual contract method)
    const builtTransaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(
        contract.call('view_pool') // ✅ This matches your contract!
      )
      .setTimeout(30)
      .build()

    // Simulate the transaction
    const simulation = await server.simulateTransaction(builtTransaction)

    if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulation)) {
      const resultValue = simulation.result?.retval

      if (!resultValue) {
        throw new Error('No result returned from contract')
      }

      // Parse the LiquidityPool struct returned by your contract
      // Your contract returns: LiquidityPool { token_a_reserve, token_b_reserve, total_swaps }
      const poolData = StellarSdk.scValToNative(resultValue) as {
        token_a_reserve: bigint
        token_b_reserve: bigint
        total_swaps: bigint
      }

      return {
        token_a_reserve: Number(poolData.token_a_reserve),
        token_b_reserve: Number(poolData.token_b_reserve),
        total_swaps: Number(poolData.total_swaps),
      }
    } else {
      console.error('Simulation error:', simulation)
      throw new Error('Contract simulation failed. Is the pool initialized?')
    }
  } catch (error) {
    console.error('Error fetching pool reserves:', error)
    throw new Error('Failed to fetch pool data. Make sure the contract is initialized with initialize_pool.')
  }
}

/**
 * Calculate expected output for a swap (client-side using AMM formula)
 */
export async function quoteSwap(
  inputAmount: number,
  fromToken: 'A' | 'B'
): Promise<number> {
  const poolData = await getPoolReserves()

  const reserveIn = fromToken === 'A' ? poolData.token_a_reserve : poolData.token_b_reserve
  const reserveOut = fromToken === 'A' ? poolData.token_b_reserve : poolData.token_a_reserve

  // AMM formula: amountOut = (amountIn * reserveOut) / (reserveIn + amountIn)
  const amountOut = (inputAmount * reserveOut) / (reserveIn + inputAmount)

  return amountOut
}

/**
 * Execute a token swap
 * Calls swap_a_for_b or swap_b_for_a based on direction
 * 
 * Your contract methods:
 * - pub fn swap_a_for_b(env: Env, amount_a_in: i128) -> i128
 * - pub fn swap_b_for_a(env: Env, amount_b_in: i128) -> i128
 * 
 * FIXED: Transaction signing issues
 */
export async function executeSwap(
  swapDirection: 'AtoB' | 'BtoA',
  inputAmount: number,
  minOutput: number
): Promise<number> {
  try {
    const sourceKeypair = getTestKeypair()
    const sourceAccount = await server.getAccount(sourceKeypair.publicKey())

    const contract = new StellarSdk.Contract(CONFIG.contractId)

    // Convert input amount to i128 ScVal
    const amountInScVal = StellarSdk.nativeToScVal(Math.floor(inputAmount), { type: 'i128' })

    // Choose the correct contract method based on swap direction
    const methodName = swapDirection === 'AtoB' ? 'swap_a_for_b' : 'swap_b_for_a'

    console.log(`Preparing ${methodName} with amount: ${inputAmount}`)

    // Build the transaction
    let builtTransaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: '100000', // Higher fee for contract calls
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(
        contract.call(
          methodName, // ✅ swap_a_for_b or swap_b_for_a
          amountInScVal // The input amount parameter
        )
      )
      .setTimeout(30)
      .build()

    // Simulate first
    console.log('Simulating transaction...')
    const simulation = await server.simulateTransaction(builtTransaction)

    if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulation)) {
      console.error('Simulation failed:', simulation)
      throw new Error('Transaction simulation failed. Check pool liquidity.')
    }

    // ✅ FIX: Properly assemble and build the transaction
    const preparedTransaction = StellarSdk.SorobanRpc.assembleTransaction(
      builtTransaction,
      simulation
    ).build() // Call .build() to get a proper Transaction object

    // Sign the transaction
    preparedTransaction.sign(sourceKeypair)

    // Submit the transaction
    console.log('Submitting transaction...')
    const sendResponse = await server.sendTransaction(preparedTransaction)

    if (sendResponse.status === 'ERROR') {
      console.error('Send error:', sendResponse)
      throw new Error('Transaction submission failed: ' + sendResponse.errorResult)
    }

    console.log('Transaction submitted, hash:', sendResponse.hash)

    // Poll for confirmation
    console.log('Waiting for confirmation...')
    let getResponse = await server.getTransaction(sendResponse.hash)

    const maxAttempts = 30
    let attempts = 0

    while (getResponse.status === 'NOT_FOUND' && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      getResponse = await server.getTransaction(sendResponse.hash)
      attempts++
      console.log(`Polling attempt ${attempts}/${maxAttempts}...`)
    }

    if (getResponse.status === 'SUCCESS') {
      // Parse the return value (output amount)
      const resultValue = getResponse.returnValue

      if (resultValue) {
        const outputAmount = Number(StellarSdk.scValToNative(resultValue))

        console.log('Swap successful! Output:', outputAmount)

        // Check slippage protection
        if (outputAmount < minOutput) {
          throw new Error(`Slippage exceeded! Expected at least ${minOutput}, got ${outputAmount}`)
        }

        return outputAmount
      }

      // If we can't parse the result, return the minimum expected
      console.warn('Could not parse output amount, returning minimum')
      return minOutput
    } else if (getResponse.status === 'FAILED') {
      console.error('Transaction failed:', getResponse)
      throw new Error('Transaction failed on chain. Check transaction details.')
    } else {
      throw new Error('Transaction timeout - check Stellar explorer for details')
    }
  } catch (error) {
    console.error('Swap execution error:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Unknown error during swap')
  }
}

/**
 * Helper function to get account balance (for debugging)
 */
export async function getAccountBalance(publicKey?: string): Promise<string> {
  try {
    const keypair = getTestKeypair()
    const account = await server.getAccount(publicKey || keypair.publicKey())
    
    // Find XLM balance
    const xlmBalance = account.balances.find((balance: any) => 
      balance.asset_type === 'native'
    )
    
    return xlmBalance ? xlmBalance.balance : '0'
  } catch (error) {
    console.error('Error fetching balance:', error)
    return 'Error'
  }
}

/**
 * Helper function to check if contract exists and is initialized
 */
export async function checkContractStatus(): Promise<{
  exists: boolean
  initialized: boolean
  poolData?: LiquidityPoolData
}> {
  try {
    const poolData = await getPoolReserves()
    
    const initialized = poolData.token_a_reserve > 0 || poolData.token_b_reserve > 0
    
    return {
      exists: true,
      initialized,
      poolData
    }
  } catch (error) {
    console.error('Contract status check failed:', error)
    return {
      exists: false,
      initialized: false
    }
  }
}