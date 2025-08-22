export interface TonConnectWallet {
  name: string;
  image: string;
  about_url: string;
  universal_url?: string;
  bridge_url?: string;
  deeplink_url?: string;
}

export interface TonProof {
  timestamp: number;
  domain: {
    lengthBytes: number;
    value: string;
  };
  signature: string;
  payload: string;
}

export interface TonAccount {
  address: string;
  chain: string;
  walletStateInit: string;
  publicKey?: string;
}

export interface TonConnectResponse {
  account: TonAccount;
  proof?: TonProof;
}

export interface SendTransactionRequest {
  validUntil: number;
  messages: Array<{
    address: string;
    amount: string;
    payload?: string;
    stateInit?: string;
  }>;
}

export interface TonConnectBridge {
  deviceInfo: {
    platform: string;
    appName: string;
    appVersion: string;
    maxProtocolVersion: number;
    features: string[];
  };
  protocolVersion: number;
  isWalletBrowser: boolean;
  connect: (request: any) => Promise<TonConnectResponse>;
  disconnect: () => Promise<void>;
  sendTransaction: (request: SendTransactionRequest) => Promise<any>;
  restoreConnection: () => Promise<TonConnectResponse | null>;
}

declare global {
  interface Window {
    tonConnectUI?: any;
    TonConnect?: {
      isWalletBrowser: boolean;
      send: (method: string, params?: any) => Promise<any>;
    };
  }
}

/**
 * Available TON wallets for connection
 */
export const TON_WALLETS: TonConnectWallet[] = [
  {
    name: "Tonkeeper",
    image: "https://tonkeeper.com/assets/tonconnect-icon.png",
    about_url: "https://tonkeeper.com",
    universal_url: "https://app.tonkeeper.com/ton-connect",
    deeplink_url: "tonkeeper-tc://ton-connect/"
  },
  {
    name: "OpenMask",
    image: "https://raw.githubusercontent.com/OpenProduct/openmask-extension/main/public/openmask-logo-128.png",
    about_url: "https://www.openmask.app",
    bridge_url: "https://bridge.tonapi.io/bridge"
  },
  {
    name: "MyTonWallet",
    image: "https://mytonwallet.io/assets/logo-256.png", 
    about_url: "https://mytonwallet.io",
    universal_url: "https://connect.mytonwallet.org",
    bridge_url: "https://bridge.mytonwallet.org"
  }
];

/**
 * TON Connect Configuration
 */
export const TON_CONNECT_CONFIG = {
  manifestUrl: `${window.location.origin}/tonconnect-manifest.json`,
  buttonRootId: 'ton-connect-button',
  uiPreferences: {
    theme: 'DARK' as const,
    colorsSet: {
      [Symbol.for('LIGHT')]: {
        connectButton: {
          background: '#0088CC',
          foreground: '#FFFFFF'
        }
      },
      [Symbol.for('DARK')]: {
        connectButton: {
          background: '#0088CC', 
          foreground: '#FFFFFF'
        }
      }
    }
  }
};

/**
 * Mock TON Connect implementation for development
 */
class MockTonConnect implements TonConnectBridge {
  deviceInfo = {
    platform: 'web',
    appName: 'TON Staking Pool',
    appVersion: '1.0.0',
    maxProtocolVersion: 2,
    features: ['sendTransaction', 'signData']
  };

  protocolVersion = 2;
  isWalletBrowser = false;

  private connected = false;
  private account: TonAccount | null = null;

  async connect(): Promise<TonConnectResponse> {
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock account data
    this.account = {
      address: "EQD7xX3V2A8B9C7E6F5G4H3I2J1K0L9M8N7O6P5Q4R3S2T1U",
      chain: "-239", // TON mainnet
      walletStateInit: "mock_state_init",
      publicKey: "mock_public_key"
    };

    this.connected = true;

    return {
      account: this.account,
      proof: {
        timestamp: Math.floor(Date.now() / 1000),
        domain: {
          lengthBytes: 21,
          value: window.location.hostname
        },
        signature: "mock_signature",
        payload: "mock_payload"
      }
    };
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.account = null;
  }

  async sendTransaction(request: SendTransactionRequest): Promise<any> {
    if (!this.connected || !this.account) {
      throw new Error('Wallet not connected');
    }

    // Simulate transaction processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    return {
      boc: "mock_transaction_boc",
      hash: "mock_transaction_hash_" + Date.now()
    };
  }

  async restoreConnection(): Promise<TonConnectResponse | null> {
    // Check if previously connected (from localStorage)
    const savedConnection = localStorage.getItem('ton-connect-connection');
    if (savedConnection) {
      try {
        const connectionData = JSON.parse(savedConnection);
        this.account = connectionData.account;
        this.connected = true;
        return connectionData;
      } catch (error) {
        localStorage.removeItem('ton-connect-connection');
      }
    }
    return null;
  }
}

// Global TON Connect instance
let tonConnect: TonConnectBridge | null = null;

/**
 * Initialize TON Connect
 */
export const initTonConnect = async (): Promise<TonConnectBridge> => {
  if (tonConnect) return tonConnect;

  // In production, use real TON Connect
  if (window.TonConnect) {
    // Real TON Connect implementation would go here
    // For now, using mock implementation
  }

  tonConnect = new MockTonConnect();
  
  // Try to restore previous connection
  await tonConnect.restoreConnection();

  return tonConnect;
};

/**
 * Get TON Connect instance
 */
export const getTonConnect = (): TonConnectBridge | null => {
  return tonConnect;
};

/**
 * Connect to TON wallet
 */
export const connectTonWallet = async (): Promise<TonConnectResponse> => {
  const tc = await initTonConnect();
  const response = await tc.connect({
    manifestUrl: TON_CONNECT_CONFIG.manifestUrl,
    items: [
      {
        name: "ton_addr"
      },
      {
        name: "ton_proof",
        payload: `ton-staking-${Date.now()}`
      }
    ]
  });

  // Save connection for restore
  localStorage.setItem('ton-connect-connection', JSON.stringify(response));

  return response;
};

/**
 * Disconnect TON wallet
 */
export const disconnectTonWallet = async (): Promise<void> => {
  const tc = getTonConnect();
  if (tc) {
    await tc.disconnect();
    localStorage.removeItem('ton-connect-connection');
  }
};

/**
 * Send TON transaction
 */
export const sendTonTransaction = async (
  toAddress: string,
  amount: string,
  payload?: string
): Promise<any> => {
  const tc = getTonConnect();
  if (!tc) {
    throw new Error('TON Connect not initialized');
  }

  const request: SendTransactionRequest = {
    validUntil: Math.floor(Date.now() / 1000) + 60, // Valid for 1 minute
    messages: [
      {
        address: toAddress,
        amount: amount, // Amount in nanotons
        payload: payload
      }
    ]
  };

  return await tc.sendTransaction(request);
};

/**
 * Format TON address for display
 */
export const formatTonAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
};

/**
 * Convert TON to nanotons
 */
export const tonToNano = (ton: string | number): string => {
  const amount = typeof ton === 'string' ? parseFloat(ton) : ton;
  return (amount * 1_000_000_000).toString();
};

/**
 * Convert nanotons to TON
 */
export const nanoToTon = (nano: string | number): string => {
  const amount = typeof nano === 'string' ? parseFloat(nano) : nano;
  return (amount / 1_000_000_000).toFixed(9);
};

/**
 * Validate TON address
 */
export const isValidTonAddress = (address: string): boolean => {
  // Basic TON address validation
  const tonAddressRegex = /^[0-9a-zA-Z\-_]{48}$/;
  return tonAddressRegex.test(address);
};

/**
 * Get wallet balance
 */
export const getWalletBalance = async (address: string): Promise<string> => {
  // In production, this would make an API call to TON network
  // For development, return mock balance
  return Promise.resolve("12.45");
};

/**
 * Create TON Connect manifest
 */
export const createTonConnectManifest = () => {
  return {
    url: window.location.origin,
    name: "TON Staking Pool",
    iconUrl: `${window.location.origin}/favicon.ico`,
    termsOfUseUrl: `${window.location.origin}/terms`,
    privacyPolicyUrl: `${window.location.origin}/privacy`
  };
};
