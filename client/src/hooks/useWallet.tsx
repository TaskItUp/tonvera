import { createContext, useContext, useState, ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "./use-toast";

interface WalletContextType {
  isConnected: boolean;
  walletAddress: string | null;
  balance: string;
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState("0.00");
  const { user } = useAuth();
  const { toast } = useToast();

  const connectMutation = useMutation({
    mutationFn: async () => {
      // Simulate TON Connect integration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock wallet connection
      const mockAddress = "EQD7xX3V2A8B9C7E6F5G4H3I2J1K0L9M8N7O6P5Q4R3S2T1U";
      const mockBalance = "12.45";

      if (user?.telegramId) {
        await apiRequest("POST", "/api/wallet/connect", {
          telegramId: user.telegramId,
          walletAddress: mockAddress
        });
      }

      return { address: mockAddress, balance: mockBalance };
    },
    onSuccess: (data) => {
      setIsConnected(true);
      setWalletAddress(data.address);
      setBalance(data.balance);
      toast({
        title: "Wallet connected!",
        description: "Your TON wallet has been connected successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  const connect = async () => {
    await connectMutation.mutateAsync();
  };

  const disconnect = () => {
    setIsConnected(false);
    setWalletAddress(null);
    setBalance("0.00");
  };

  return (
    <WalletContext.Provider 
      value={{
        isConnected,
        walletAddress,
        balance,
        isLoading: connectMutation.isPending,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

// HOC to wrap components with WalletProvider
export const withWallet = (Component: React.ComponentType) => {
  return function WithWalletComponent(props: any) {
    return (
      <WalletProvider>
        <Component {...props} />
      </WalletProvider>
    );
  };
};
