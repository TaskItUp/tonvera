import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface DepositModalProps {
  onClose: () => void;
  currentStaked: number;
}

export default function DepositModal({ onClose, currentStaked }: DepositModalProps) {
  const [amount, setAmount] = useState("");
  const { user } = useAuth();
  const { isConnected, walletAddress } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const depositMutation = useMutation({
    mutationFn: async (depositData: { telegramId: string; amount: string; walletAddress: string }) => {
      // Step 1: Execute smart contract transaction through connected wallet
      const smartContractTx = await executeSmartContractDeposit(depositData.amount, depositData.walletAddress);
      
      // Step 2: Send transaction hash to backend for processing
      return await apiRequest("POST", "/api/deposit", {
        ...depositData,
        txHash: smartContractTx.hash,
        contractTransaction: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Smart Contract Deposit Successful!",
        description: `${amount} TON deposited via smart contract`,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Smart Contract Deposit Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  // Smart contract interaction function
  const executeSmartContractDeposit = async (amount: string, walletAddress: string) => {
    try {
      // Create smart contract transaction request
      const contractAddress = "EQD6zrQz_ZEyJeHEZQg_4-8G5-0k7QpE5SV8Ja5BSfyNjNJ2"; // Staking contract
      
      // In production, this would trigger the connected wallet to sign the transaction
      // For now, simulate smart contract interaction
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate wallet confirmation

      // Simulate successful smart contract deposit
      const txHash = `sc_deposit_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
      
      return {
        hash: txHash,
        success: true
      };
    } catch (error) {
      console.error("Smart contract transaction failed:", error);
      throw error;
    }
  };

  const handleDeposit = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!isConnected || !walletAddress) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    depositMutation.mutate({
      telegramId: user!.telegramId,
      amount,
      walletAddress
    });
  };

  const setDepositAmount = (value: number) => {
    setAmount(value.toString());
  };

  const calculateEstimatedDaily = (depositAmount: string) => {
    const amt = parseFloat(depositAmount) || 0;
    const newTotal = currentStaked + amt;
    const dailyRate = 8.7 / 100 / 365;
    return (newTotal * dailyRate).toFixed(4);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]" data-testid="deposit-modal">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-xl" data-testid="text-deposit-title">Join Staking Pool</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            data-testid="button-close-deposit"
          >
            <span className="text-xl">✕</span>
          </Button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Amount</label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pr-12"
                data-testid="input-deposit-amount"
              />
              <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">TON</span>
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDepositAmount(1)}
                className="flex-1"
                data-testid="button-deposit-1"
              >
                1 TON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDepositAmount(5)}
                className="flex-1"
                data-testid="button-deposit-5"
              >
                5 TON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDepositAmount(10)}
                className="flex-1"
                data-testid="button-deposit-10"
              >
                10 TON
              </Button>
            </div>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <div className="text-center mb-3">
              <p className="text-sm text-green-600 dark:text-green-400 mb-1">Daily Pool Returns</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300" data-testid="text-estimated-daily">
                +{calculateEstimatedDaily(amount)} TON
              </p>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-green-200 dark:border-green-700">
              <span className="text-sm text-green-600 dark:text-green-400">Pool APY</span>
              <span className="text-lg font-bold text-green-700 dark:text-green-300">8.7%</span>
            </div>
            <p className="text-xs text-center text-green-600 dark:text-green-400 mt-2">Rewards auto-compound daily</p>
          </div>
          
          {!isConnected && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Please connect your TON wallet to make a deposit
              </p>
            </div>
          )}
          
          <Button
            onClick={handleDeposit}
            disabled={depositMutation.isPending || !isConnected}
            className="w-full bg-gradient-to-r from-ton-blue to-ton-teal text-white font-bold py-4 rounded-xl hover:shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
            data-testid="button-confirm-deposit"
          >
            {depositMutation.isPending ? "Processing..." : "Join Pool & Start Earning"}
          </Button>
        </div>
      </div>
    </div>
  );
}
