import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function WalletConnection() {
  const { isConnected, walletAddress, balance, connect, disconnect, isLoading } = useWallet();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connect();
    } finally {
      setIsConnecting(false);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  return (
    <Card data-testid="wallet-connection">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg" data-testid="text-wallet-title">TON Wallet</h3>
          <div className="flex items-center gap-2" data-testid="wallet-status">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        {!isConnected ? (
          <Button
            onClick={handleConnect}
            disabled={isConnecting || isLoading}
            className="w-full bg-gradient-to-r from-ton-blue to-ton-teal text-white font-semibold py-3 px-4 rounded-xl hover:opacity-90 transition-opacity"
            data-testid="button-connect-wallet"
          >
            {isConnecting ? "Connecting..." : "Connect TON Wallet"}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg" data-testid="wallet-info">
              <p className="text-xs text-gray-500 mb-1">Wallet Address</p>
              <p className="font-mono text-sm break-all" data-testid="text-wallet-address">
                {formatAddress(walletAddress || '')}
              </p>
              <p className="text-xs text-gray-500 mt-2 mb-1">Balance</p>
              <p className="font-semibold" data-testid="text-wallet-balance">
                {balance} TON
              </p>
            </div>
            <Button
              onClick={disconnect}
              variant="outline"
              size="sm"
              className="w-full"
              data-testid="button-disconnect-wallet"
            >
              Disconnect
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
