/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STELLAR_NETWORK: string
  readonly VITE_STELLAR_RPC_URL: string
  readonly VITE_CONTRACT_ID: string
  readonly VITE_TEST_SECRET_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Freighter wallet types (if you want to use Freighter)
interface Window {
  freighter?: {
    getPublicKey: () => Promise<string>
    signTransaction: (xdr: string, opts: any) => Promise<string>
    isConnected: () => Promise<boolean>
  }
}