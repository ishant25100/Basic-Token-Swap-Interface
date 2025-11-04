/**
 * AMM (Automated Market Maker) Utility Functions
 * 
 * This file contains the mathematical formulas used for:
 * 1. Calculating swap outputs (constant product formula)
 * 2. Estimating price impact
 * 3. Calculating slippage
 * 
 * The core formula is: x * y = k (constant product)
 * Where x and y are the reserves of two tokens in the pool
 */

/**
 * Calculate output amount using constant product formula
 * Formula: amountOut = (amountIn * reserveOut) / (reserveIn + amountIn)
 * 
 * This is derived from the constant product formula x * y = k
 * 
 * Example:
 * - Pool has 1000 Token A and 1000 Token B
 * - User wants to swap 100 Token A
 * - Output = (100 * 1000) / (1000 + 100) = 90.909 Token B
 * 
 * @param amountIn - Amount of input token
 * @param reserveIn - Reserve of input token in the pool
 * @param reserveOut - Reserve of output token in the pool
 * @returns Amount of output token user will receive
 */
export function calculateOutputAmount(
  amountIn: number,
  reserveIn: number,
  reserveOut: number
): number {
  // Validate inputs
  if (amountIn <= 0 || reserveIn <= 0 || reserveOut <= 0) {
    return 0
  }

  // Step 1: Calculate the numerator (amountIn * reserveOut)
  const numerator = amountIn * reserveOut

  // Step 2: Calculate the denominator (reserveIn + amountIn)
  const denominator = reserveIn + amountIn

  // Step 3: Divide to get the output amount
  const amountOut = numerator / denominator

  return amountOut
}

/**
 * Calculate price impact of a swap
 * Price impact = ((reserveOut / reserveIn) - (newReserveOut / newReserveIn)) / (reserveOut / reserveIn) * 100
 * 
 * This shows how much the swap will move the price compared to the current price
 * 
 * Example:
 * - Current price: 1 A = 1 B (1000/1000)
 * - After swap: 1 A = 0.916 B (1100/1090.909)
 * - Price impact: 8.33%
 * 
 * @param amountIn - Amount of input token
 * @param reserveIn - Reserve of input token in the pool
 * @param reserveOut - Reserve of output token in the pool
 * @returns Price impact as a percentage
 */
export function calculatePriceImpact(
  amountIn: number,
  reserveIn: number,
  reserveOut: number
): number {
  if (amountIn <= 0 || reserveIn <= 0 || reserveOut <= 0) {
    return 0
  }

  // Step 1: Calculate current price (how much output per 1 input)
  const currentPrice = reserveOut / reserveIn

  // Step 2: Calculate output amount
  const amountOut = calculateOutputAmount(amountIn, reserveIn, reserveOut)

  // Step 3: Calculate new reserves after the swap
  const newReserveIn = reserveIn + amountIn
  const newReserveOut = reserveOut - amountOut

  // Step 4: Calculate new price
  const newPrice = newReserveOut / newReserveIn

  // Step 5: Calculate price impact as percentage
  const priceImpact = ((currentPrice - newPrice) / currentPrice) * 100

  return priceImpact
}

/**
 * Calculate minimum output amount with slippage tolerance
 * 
 * Example:
 * - Expected output: 90.909 tokens
 * - Slippage tolerance: 1%
 * - Minimum output: 90.909 * (1 - 0.01) = 90.0 tokens
 * 
 * @param expectedOutput - Expected output amount
 * @param slippagePercent - Slippage tolerance as percentage (e.g., 1 for 1%)
 * @returns Minimum acceptable output amount
 */
export function calculateMinOutput(
  expectedOutput: number,
  slippagePercent: number
): number {
  // Convert percentage to decimal (1% = 0.01)
  const slippageDecimal = slippagePercent / 100

  // Calculate minimum output
  const minOutput = expectedOutput * (1 - slippageDecimal)

  return minOutput
}

/**
 * Calculate the current exchange rate (price)
 * 
 * @param reserveA - Reserve of Token A
 * @param reserveB - Reserve of Token B
 * @returns How much Token B you get for 1 Token A
 */
export function calculateExchangeRate(
  reserveA: number,
  reserveB: number
): number {
  if (reserveA <= 0) return 0
  return reserveB / reserveA
}

/**
 * Validate if a swap is possible
 * 
 * @param amountIn - Input amount
 * @param reserveOut - Output token reserve
 * @returns true if swap is valid, false otherwise
 */
export function isValidSwap(amountIn: number, reserveOut: number): boolean {
  // Check if input is positive
  if (amountIn <= 0) return false

  // Calculate expected output
  // Calculate expected output
  const amountOut = calculateOutputAmount(amountIn, 1000, reserveOut) // Using dummy reserveIn
  
  // Check if output is less than reserve (can't drain the pool)
  if (amountOut >= reserveOut) return false

  return true
}