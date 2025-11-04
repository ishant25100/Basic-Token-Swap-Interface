import { useState, useEffect } from 'react'
import './App.css'
import SwapWidget from './components/SwapWidget'
import PoolInfo from './components/PoolInfo'
import { getPoolReserves, LiquidityPoolData } from './soroban/soroban'

function App() {
  const [poolData, setPoolData] = useState<LiquidityPoolData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Function to fetch pool data from the contract
  const fetchPoolData = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getPoolReserves()
      setPoolData(data)
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Error fetching pool data:', err)
      setError('Failed to fetch pool data. Make sure the contract is initialized.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch pool data on component mount
  useEffect(() => {
    fetchPoolData()
  }, [])

  // Callback to refresh pool data after a swap
  const handleSwapComplete = () => {
    fetchPoolData()
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-white">
          Basic Token Swap Interface
        </h1>
        <p className="text-gray-400">
          Decentralized Token Exchange on Stellar Soroban
        </p>
      </header>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-900 border border-red-700 rounded-lg text-red-200">
          {error}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Swap Widget */}
        <div className="card">
          <SwapWidget 
            poolData={poolData} 
            onSwapComplete={handleSwapComplete}
          />
        </div>

        {/* Pool Info */}
        <div className="card">
          <PoolInfo 
            poolData={poolData} 
            loading={loading}
            lastUpdate={lastUpdate}
            onRefresh={fetchPoolData}
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-gray-500 text-sm">
        <p>Built with ❤️ on Stellar Soroban</p>
        <p className="mt-2">
          Contract ID: {import.meta.env.VITE_CONTRACT_ID || 'Not configured'}
        </p>
      </footer>
    </div>
  )
}

export default App