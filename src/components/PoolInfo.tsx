import { useState } from 'react'
import { LiquidityPoolData } from '../soroban/soroban'
import * as StellarSdk from '@stellar/stellar-sdk'

interface PoolInfoProps {
  poolData: LiquidityPoolData | null
  loading: boolean
  lastUpdate: Date
  onRefresh: () => void
}

// Configuration (same as soroban.ts)
const CONFIG = {
  contractId: import.meta.env.VITE_CONTRACT_ID || 'CDRUJA7RWIJNPD4GHXIPC5PAPKXJKXGYJXZKUQ3HKLNLCXY4JBFZXS3E',
  network: import.meta.env.VITE_STELLAR_NETWORK || 'testnet',
  rpcUrl: import.meta.env.VITE_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org',
  testSecretKey: import.meta.env.VITE_TEST_SECRET_KEY || '',
}

const server = new StellarSdk.SorobanRpc.Server(CONFIG.rpcUrl)

const getNetworkPassphrase = (): string => {
  if (CONFIG.network === 'testnet') {
    return StellarSdk.Networks.TESTNET
  } else if (CONFIG.network === 'futurenet') {
    return StellarSdk.Networks.FUTURENET
  } else {
    return StellarSdk.Networks.STANDALONE
  }
}

function getTestKeypair(): StellarSdk.Keypair {
  if (!CONFIG.testSecretKey) {
    throw new Error('No test secret key found in .env')
  }
  return StellarSdk.Keypair.fromSecret(CONFIG.testSecretKey)
}

function PoolInfo({ poolData, loading, lastUpdate, onRefresh }: PoolInfoProps) {
  const [initializing, setInitializing] = useState(false)
  const [initStatus, setInitStatus] = useState<string>('')
  const [showInitForm, setShowInitForm] = useState(false)
  const [tokenAAmount, setTokenAAmount] = useState<string>('1000')
  const [tokenBAmount, setTokenBAmount] = useState<string>('1000')

  // Calculate current price (how much Token B per 1 Token A)
  const currentPrice = poolData
    ? poolData.token_b_reserve / poolData.token_a_reserve
    : 0

  // Check if pool is uninitialized (all zeros)
  const isPoolUninitialized = poolData && 
    poolData.token_a_reserve === 0 && 
    poolData.token_b_reserve === 0 && 
    poolData.total_swaps === 0

  /**
   * Initialize the liquidity pool
   * FIXED: Proper transaction signing
   */
  const handleInitializePool = async () => {
    if (!tokenAAmount || !tokenBAmount) {
      setInitStatus('Please enter valid amounts for both tokens')
      return
    }

    const amountA = parseInt(tokenAAmount)
    const amountB = parseInt(tokenBAmount)

    if (amountA <= 0 || amountB <= 0) {
      setInitStatus('Amounts must be positive numbers')
      return
    }

    setInitializing(true)
    setInitStatus('Initializing pool...')

    try {
      const sourceKeypair = getTestKeypair()
      const sourceAccount = await server.getAccount(sourceKeypair.publicKey())

      const contract = new StellarSdk.Contract(CONFIG.contractId)

      // Convert amounts to i128 ScVal
      const tokenAScVal = StellarSdk.nativeToScVal(amountA, { type: 'i128' })
      const tokenBScVal = StellarSdk.nativeToScVal(amountB, { type: 'i128' })

      // Build transaction to call initialize_pool
      let builtTransaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: '100000',
        networkPassphrase: getNetworkPassphrase(),
      })
        .addOperation(
          contract.call(
            'initialize_pool',
            tokenAScVal,
            tokenBScVal
          )
        )
        .setTimeout(30)
        .build()

      // Simulate the transaction
      setInitStatus('Simulating transaction...')
      const simulation = await server.simulateTransaction(builtTransaction)

      if (!StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulation)) {
        console.error('Simulation failed:', simulation)
        throw new Error('Pool might already be initialized or simulation failed')
      }

      // ✅ FIX: Properly assemble and sign
      const preparedTransaction = StellarSdk.SorobanRpc.assembleTransaction(
        builtTransaction,
        simulation
      ).build()

      // Sign the transaction
      preparedTransaction.sign(sourceKeypair)

      // Submit the transaction
      setInitStatus('Submitting transaction...')
      const sendResponse = await server.sendTransaction(preparedTransaction)

      if (sendResponse.status === 'ERROR') {
        throw new Error('Transaction submission failed')
      }

      // Poll for confirmation
      setInitStatus('Waiting for confirmation...')
      let getResponse = await server.getTransaction(sendResponse.hash)

      const maxAttempts = 30
      let attempts = 0

      while (getResponse.status === 'NOT_FOUND' && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        getResponse = await server.getTransaction(sendResponse.hash)
        attempts++
      }

      if (getResponse.status === 'SUCCESS') {
        setInitStatus(`✅ Pool initialized successfully! Token A: ${amountA}, Token B: ${amountB}`)
        setShowInitForm(false)
        
        // Refresh pool data after 2 seconds
        setTimeout(() => {
          onRefresh()
          setInitStatus('')
        }, 2000)
      } else if (getResponse.status === 'FAILED') {
        throw new Error('Transaction failed on chain. Pool might already be initialized.')
      } else {
        throw new Error('Transaction timeout')
      }
    } catch (error) {
      console.error('Initialize pool error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setInitStatus(`❌ Failed to initialize: ${errorMessage}`)
    } finally {
      setInitializing(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Pool Information</h2>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Show Initialize Button if Pool is Uninitialized */}
      {isPoolUninitialized && (
        <div className="mb-6 p-4 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded-lg">
          <div className="text-yellow-300 mb-3">
            ⚠️ Pool not initialized yet. Initialize it to start swapping!
          </div>
          
          {!showInitForm ? (
            <button
              onClick={() => setShowInitForm(true)}
              className="bg-yellow-600 hover:bg-yellow-500 text-white py-2 px-4 rounded transition w-full"
            >
              Initialize Pool
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-yellow-200 mb-1">
                  Token A Initial Amount
                </label>
                <input
                  type="number"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  value={tokenAAmount}
                  onChange={(e) => setTokenAAmount(e.target.value)}
                  disabled={initializing}
                  placeholder="1000"
                />
              </div>

              <div>
                <label className="block text-sm text-yellow-200 mb-1">
                  Token B Initial Amount
                </label>
                <input
                  type="number"
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  value={tokenBAmount}
                  onChange={(e) => setTokenBAmount(e.target.value)}
                  disabled={initializing}
                  placeholder="1000"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleInitializePool}
                  disabled={initializing}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-2 px-4 rounded transition disabled:opacity-50"
                >
                  {initializing ? 'Initializing...' : 'Confirm Initialize'}
                </button>
                <button
                  onClick={() => setShowInitForm(false)}
                  disabled={initializing}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition"
                >
                  Cancel
                </button>
              </div>

              {initStatus && (
                <div className="mt-3 p-3 bg-gray-800 rounded text-sm text-gray-300">
                  {initStatus}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {loading && !poolData ? (
        <div className="text-center text-gray-400 py-8">
          <div className="animate-pulse">Loading pool data...</div>
        </div>
      ) : poolData ? (
        <>
          {/* Token Reserves */}
          <div className="space-y-4 mb-6">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Token A Reserve</div>
              <div className="text-2xl font-bold text-white">
                {poolData.token_a_reserve.toLocaleString()}
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-sm text-gray-400 mb-1">Token B Reserve</div>
              <div className="text-2xl font-bold text-white">
                {poolData.token_b_reserve.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Pool Statistics - Only show if initialized */}
          {!isPoolUninitialized && (
            <div className="bg-gray-800 p-4 rounded-lg mb-6">
              <div className="text-sm text-gray-400 mb-3">Pool Statistics</div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Price:</span>
                  <span className="text-white font-medium">
                    1 A = {currentPrice.toFixed(4)} B
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Inverse Price:</span>
                  <span className="text-white font-medium">
                    1 B = {(1 / currentPrice).toFixed(4)} A
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Total Swaps:</span>
                  <span className="text-white font-medium">
                    {poolData.total_swaps}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Total Liquidity:</span>
                  <span className="text-white font-medium">
                    {(poolData.token_a_reserve + poolData.token_b_reserve).toLocaleString()} tokens
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Pool Ratio:</span>
                  <span className="text-white font-medium">
                    {((poolData.token_a_reserve / (poolData.token_a_reserve + poolData.token_b_reserve)) * 100).toFixed(1)}% A / 
                    {((poolData.token_b_reserve / (poolData.token_a_reserve + poolData.token_b_reserve)) * 100).toFixed(1)}% B
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Last Update */}
          <div className="text-xs text-gray-500 text-center mb-4">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </>
      ) : (
        <div className="text-center text-red-400 py-8">
          <div className="mb-4">❌ Failed to load pool data</div>
          <button
            onClick={onRefresh}
            className="bg-red-700 hover:bg-red-600 text-white py-2 px-4 rounded transition"
          >
            Try Again
          </button>
        </div>
      )}

      {/* AMM Formula Info */}
      <div className="mt-6 p-4 bg-blue-900 bg-opacity-20 border border-blue-800 rounded-lg">
        <div className="text-sm text-blue-300">
          <div className="font-medium mb-2 flex items-center">
            <span className="mr-2">📊</span>
            AMM Formula: Constant Product
          </div>
          <div className="text-xs space-y-1">
            <div>• Formula: <code className="bg-blue-950 px-1 py-0.5 rounded">x × y = k</code></div>
            <div>• Prices adjust automatically based on supply and demand</div>
            <div>• Larger swaps have higher price impact</div>
            {poolData && !isPoolUninitialized && (
              <div className="mt-2 pt-2 border-t border-blue-800">
                Current k value: <code className="bg-blue-950 px-1 py-0.5 rounded">
                  {(poolData.token_a_reserve * poolData.token_b_reserve).toLocaleString()}
                </code>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contract Info */}
      <div className="mt-4 p-3 bg-gray-800 bg-opacity-50 rounded text-xs text-gray-500">
        <div className="mb-1">Network: <span className="text-gray-400">{CONFIG.network}</span></div>
        <div className="break-all">
          Contract: <span className="text-gray-400">{CONFIG.contractId}</span>
        </div>
      </div>
    </div>
  )
}

export default PoolInfo