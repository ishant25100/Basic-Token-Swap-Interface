# Basic Token Swap Interface

A simple, educational DEX (Decentralized Exchange) frontend for swapping tokens on Stellar Soroban. This project demonstrates how to interact with a Soroban AMM (Automated Market Maker) smart contract using TypeScript and React.

![alt text](<Screenshot 2025-11-04 165505.png>)
<video controls src="Stellar vidio1.mp4" title="Title"></video>

## 🎯 What This Project Does

- **Swap Tokens**: Exchange between Token A and Token B using an AMM formula
- **View Pool Reserves**: See real-time liquidity pool data
- **Price Estimation**: Calculate expected output and price impact before swapping
- **Slippage Protection**: Set tolerance levels to protect against unfavorable price changes

## 📋 Prerequisites

Before you begin, make sure you have:

1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **npm** or **yarn** package manager (comes with Node.js)
3. **Stellar testnet account** with XLM for gas fees
   - Get one here: https://laboratory.stellar.org/#account-creator?network=test
4. **Your Soroban contract deployed** on testnet
   - Contract ID: `CDRUJA7RWIJNPD4GHXIPC5PAPKXJKXGYJXZKUQ3HKLNLCXY4JBFZXS3E`

## 🚀 Setup Instructions

### Step 1: Install Dependencies

Navigate to the project folder and install all required packages:
```bash
cd Basic-Token-Swap-Interface
npm install
```

This installs:
- React + TypeScript for the UI
- Vite for fast development
- Stellar SDK for blockchain interactions
- Tailwind CSS for styling

### Step 2: Configure Environment

Create a `.env` file by copying the example:
```bash
cp .env.example .env
```

Then edit `.env` and add your values:
```env
# Stellar Network Configuration
VITE_STELLAR_NETWORK=testnet
VITE_STELLAR_RPC_URL=https://soroban-testnet.stellar.org

# Your deployed contract ID
VITE_CONTRACT_ID=CDRUJA7RWIJNPD4GHXIPC5PAPKXJKXGYJXZKUQ3HKLNLCXY4JBFZXS3E

# FOR LOCAL TESTING ONLY - Get from Stellar Laboratory
VITE_TEST_SECRET_KEY=YOUR_SECRET_KEY_HERE
```

**⚠️ SECURITY WARNING**: Never commit your `.env` file or share your secret key! The secret key is only for local testing. In production, use Freighter wallet instead.

### Step 3: Update Contract Method Names

Your Soroban contract might use different method names than what we guessed. Open `src/soroban/soroban.ts` and update these:
```typescript
// Line ~150 - Update this to match your contract
contract.call(
  'get_reserves'  // ⚠️ Change to your actual method name
)

// Line ~250 - Update this to match your contract
contract.call(
  'swap',  // ⚠️ Change to your actual method name
  fromTokenScVal,
  amountInScVal,
  minOutputScVal
)
```

**How to find your contract's method names:**
1. Check your contract source code (e.g., `contract/src/lib.rs`)
2. Look for `#[contractimpl]` functions
3. Use those exact function names in the `contract.call()` statements

### Step 4: Run the Development Server

Start the local development server:
```bash
npm run dev
```

You should see output like:
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Open your browser and go to `http://localhost:5173/`

## 🧪 Testing the Swap

### Manual Testing Steps

1. **Check Pool Reserves**
   - When the app loads, it should display Token A and Token B reserves
   - If you see an error, verify your contract ID in `.env`

2. **Perform a Test Swap**
   - Select Token A or Token B from the dropdown
   - Enter an amount (e.g., `10`)
   - Review the estimated output and price impact
   - Adjust slippage tolerance if needed (default: 1%)
   - Click "Swap Tokens"

3. **Monitor the Transaction**
   - Watch the transaction status at the bottom
   - After success, pool reserves should update automatically

### Getting Testnet Tokens

You'll need testnet tokens to test swaps:

1. **Get XLM for gas fees**:
   - Visit: https://laboratory.stellar.org/#account-creator?network=test
   - Create an account and save the secret key
   - The account comes with 10,000 test XLM

2. **Get test tokens** (if your contract supports initialization):
   - You may need to call your contract's initialization method
   - Or deploy test tokens using Stellar CLI

### Troubleshooting

**Problem**: "Failed to fetch pool data"
- **Solution**: Check if your contract is initialized on testnet
- Verify the contract ID in `.env` matches your deployed contract

**Problem**: "Transaction simulation failed"
- **Solution**: Check contract method names in `src/soroban/soroban.ts`
- Ensure your account has enough XLM for gas fees
- Verify network configuration (testnet vs futurenet)

**Problem**: "No test secret key found"
- **Solution**: Add `VITE_TEST_SECRET_KEY` to your `.env` file
- Get a testnet account from Stellar Laboratory

## 📁 Project Structure
```
src/
├── main.tsx              # App entry point
├── App.tsx               # Main app component
├── components/
│   ├── SwapWidget.tsx    # Token swap UI
│   └── PoolInfo.tsx      # Pool reserves display
├── soroban/
│   └── soroban.ts        # Smart contract interactions
└── utils/
    └── amm.ts            # AMM math formulas (x*y=k)
```

## 🔧 Advanced: Adding Freighter Wallet Support

For production use, you should integrate Freighter wallet instead of using secret keys:

1. Install Freighter extension: https://www.freighter.app/
2. Uncomment the `executeSwapWithFreighter` function in `src/soroban/soroban.ts`
3. Add a "Connect Wallet" button to your UI
4. Replace `executeSwap` calls with `executeSwapWithFreighter`

## 📚 Learn More

- **Stellar Documentation**: https://developers.stellar.org/
- **Soroban Smart Contracts**: https://soroban.stellar.org/docs
- **Stellar SDK**: https://github.com/stellar/js-stellar-sdk
- **AMM Basics**: https://www.coinbase.com/learn/crypto-basics/what-is-an-automated-market-maker

## 🛠️ Build for Production

When you're ready to deploy:
```bash
npm run build
```

This creates an optimized build in the `dist/` folder that you can deploy to:
- Vercel
- Netlify
- GitHub Pages
- Any static hosting service

## ⚠️ Important Notes

1. **Contract Method Names**: This project guesses common method names (`get_reserves`, `swap`). You MUST update these to match your actual contract.

2. **Secret Key Security**: Never use secret keys in production. Always use Freighter or another wallet solution.

3. **Token Precision**: The code assumes 6 decimal places (1_000_000 scaling). Adjust if your tokens use different precision.

4. **Error Handling**: This is an educational project. Add more robust error handling for production use.

## 🤝 Need Help?

- Check the Stellar Discord: https://discord.gg/stellardev
- Review Soroban examples: https://github.com/stellar/soroban-examples
- Read the Stellar docs: https://developers.stellar.org/

Happy swapping! 🚀