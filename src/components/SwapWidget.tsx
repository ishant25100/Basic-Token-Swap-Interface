import { useState } from 'react'
import { LiquidityPoolData, executeSwap } from '../soroban/soroban'
import { calculateOutputAmount, calculatePriceImpact } from '../utils/amm'

interface SwapWidgetProps {
  poolData: LiquidityPoolData | null
  onSwapComplete: () => void
}

type SwapDirection = 'AtoB' | 'BtoA'

function SwapWidget({ poolData, onSwapComplete }: SwapWidgetProps) {
  const [inputAmount, setInputAmount] = useState<string>('')
  const [swapDirection, setSwapDirection] = useState<SwapDirection>('AtoB')
  const [slippageTolerance, setSlippageTolerance] = useState<number>(1) // 1% default
  const [loading, setLoading] = useState(false)
  const [txStatus, setTxStatus] = useState<string>('')

  // Calculate estimated output based on AMM formula
  const estimatedOutput = poolData && inputAmount
    ? calculateOutputAmount(
        parseFloat(inputAmount),
        swapDirection === 'AtoB' ? poolData.token_a_reserve : poolData.token_b_reserve,
        swapDirection === 'AtoB' ? poolData.token_b_reserve : poolData.token_a_reserve
      )
    : 0

  // Calculate price impact
  const priceImpact = poolData && inputAmount
    ? calculatePriceImpact(
        parseFloat(inputAmount),
        swapDirection === 'AtoB' ? poolData.token_a_reserve : poolData.token_b_reserve,
        swapDirection === 'AtoB' ? poolData.token_b_reserve : poolData.token_a_reserve
      )
    : 0

  // Calculate minimum output with slippage protection
  const minOutput = estimatedOutput * (1 - slippageTolerance / 100)

  // Handle swap execution
  const handleSwap = async () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      setTxStatus('Please enter a valid amount')
      return
    }

    if (!poolData) {
      setTxStatus('Pool data not available')
      return
    }

    setLoading(true)
    setTxStatus('Preparing transaction...')

    try {
      const result = await executeSwap(
        swapDirection,
        parseFloat(inputAmount),
        minOutput
      )

      setTxStatus(`Swap successful! Received: ${result.toFixed(4)} tokens`)
      setInputAmount('')
      
      // Refresh pool data after successful swap
      setTimeout(() => {
        onSwapComplete()
      }, 1000)
    } catch (error) {
      console.error('Swap error:', error)
      setTxStatus(`Swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  // Flip swap direction
  const flipDirection = () => {
    setSwapDirection(swapDirection === 'AtoB' ? 'BtoA' : 'AtoB')
    setInputAmount('')
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-white">Swap Tokens</h2>

      {/* From Token */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          From
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            className="input-field flex-1"
            placeholder="0.0"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            disabled={loading}
          />
          <select
            className="select-field"
            value={swapDirection === 'AtoB' ? 'A' : 'B'}
            onChange={(e) =>
              setSwapDirection(e.target.value === 'A' ? 'AtoB' : 'BtoA')
            }
            disabled={loading}
          >
            <option value="A">Token A</option>
            <option value="B">Token B</option>
          </select>
        </div>
      </div>

      {/* Swap Direction Button */}
      <div className="flex justify-center my-4">
        <button
          onClick={flipDirection}
          className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-full transition"
          disabled={loading}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </button>
      </div>

      {/* To Token */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          To (estimated)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            className="input-field flex-1"
            placeholder="0.0"
            value={estimatedOutput > 0 ? estimatedOutput.toFixed(4) : ''}
            disabled
          />
          <select
            className="select-field"
            value={swapDirection === 'AtoB' ? 'B' : 'A'}
            disabled
          >
            <option value="A">Token A</option>
            <option value="B">Token B</option>
          </select>
        </div>
      </div>

      {/* Swap Details */}
      {inputAmount && parseFloat(inputAmount) > 0 && (
        <div className="mb-4 p-4 bg-gray-800 rounded-lg text-sm">
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">Price Impact:</span>
            <span className={priceImpact > 5 ? 'text-red-400' : 'text-green-400'}>
              {priceImpact.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">Slippage Tolerance:</span>
            <span className="text-white">{slippageTolerance}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Minimum Received:</span>
            <span className="text-white">{minOutput.toFixed(4)}</span>
          </div>
        </div>
      )}

      {/* Slippage Settings */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Slippage Tolerance: {slippageTolerance}%
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setSlippageTolerance(0.5)}
            className={`flex-1 py-2 px-4 rounded ${
              slippageTolerance === 0.5
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            0.5%
          </button>
          <button
            onClick={() => setSlippageTolerance(1)}
            className={`flex-1 py-2 px-4 rounded ${
              slippageTolerance === 1
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            1%
          </button>
          <button
            onClick={() => setSlippageTolerance(3)}
            className={`flex-1 py-2 px-4 rounded ${
              slippageTolerance === 3
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            3%
          </button>
        </div>
      </div>

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={loading || !inputAmount || !poolData}
        className="button-primary w-full"
      >
        {loading ? 'Swapping...' : 'Swap Tokens'}
      </button>

      {/* Transaction Status */}
      {txStatus && (
        <div className="mt-4 p-3 bg-gray-800 rounded text-sm text-gray-300">
          {txStatus}
        </div>
      )}

      {/* Warning for high price impact */}
      {priceImpact > 5 && (
        <div className="mt-4 p-3 bg-yellow-900 border border-yellow-700 rounded text-sm text-yellow-200">
          ⚠️ Warning: High price impact! Consider swapping a smaller amount.
        </div>
      )}
    </div>
  )
}

export default SwapWidget