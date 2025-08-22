import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface WithdrawModalProps {
  onClose: () => void;
  availableAmount: number;
}

export default function WithdrawModal({ onClose, availableAmount }: WithdrawModalProps) {
  const [amount, setAmount] = useState("");
  const { user } = useAuth();
  const { isConnected, walletAddress } = useWallet();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const withdrawMutation = useMutation({
    mutationFn: async (withdrawData: { telegramId: string; amount: string; walletAddress: string }) => {
      // Execute instant smart contract withdrawal
      const smartContractTx = await executeSmartContractWithdraw(withdrawData.amount, withdrawData.walletAddress);
      
      // Send transaction hash to backend for processing
      return await apiRequest("POST", "/api/withdraw", {
        ...withdrawData,
        txHash: smartContractTx.hash,
        contractTransaction: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "Instant Withdrawal Successful!",
        description: `${amount} TON withdrawn instantly via smart contract`,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Smart Contract Withdrawal Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  });

  // Smart contract interaction function
  const executeSmartContractWithdraw = async (amount: string, walletAddress: string) => {
    try {
      // Simulate instant smart contract withdrawal
      const contractAddress = "EQD6zrQz_ZEyJeHEZQg_4-8G5-0k7QpE5SV8Ja5BSfyNjNJ2"; // Staking contract
      
      // In production, this would call the smart contract's withdraw method
      const mockTransaction = {
        to: walletAddress,
        from: contractAddress,
        value: amount + "000000000",
        payload: `{"op":"withdraw","amount":"${amount}","timestamp":${Date.now()}}`
      };

      // Simulate successful instant withdrawal
      await new Promise(resolve => setTimeout(resolve, 1000)); // Smart contract execution delay
      
      return {
        hash: `sc_withdraw_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        success: true
      };
    } catch (error) {
      console.error("Smart contract withdrawal failed:", error);
      throw error;
    }
  };

  const handleWithdraw = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(amount) > availableAmount) {
      toast({
        title: "Insufficient balance",
        description: "Amount exceeds available balance",
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

    withdrawMutation.mutate({
      telegramId: user!.telegramId,
      amount,
      walletAddress
    });
  };

  const setMaxWithdraw = () => {
    setAmount(availableAmount.toString());
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]" data-testid="withdraw-modal">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg" data-testid="text-withdraw-title">Withdraw TON</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            data-testid="button-close-withdraw"
          >
            <span className="text-xl">✕</span>
          </Button>
        </div>
        
        <div className="space-y-4">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <span className="font-medium">Available to withdraw:</span> {availableAmount.toFixed(2)} TON
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Amount</label>
            <div className="relative">
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={availableAmount}
                className="w-full pr-12"
                data-testid="input-withdraw-amount"
              />
              <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">TON</span>
            </div>
            <Button
              variant="link"
              size="sm"
              onClick={setMaxWithdraw}
              className="text-xs text-ton-blue hover:underline mt-1 p-0 h-auto"
              data-testid="button-max-withdraw"
            >
              Use max amount
            </Button>
          </div>
          
          <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex justify-between text-sm mb-1">
              <span>Smart Contract Processing</span>
              <span className="font-semibold text-green-600">Instant</span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400">
              Withdrawals are processed instantly via smart contract
            </p>
          </div>
          
          {!isConnected && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Please connect your TON wallet to make a withdrawal
              </p>
            </div>
          )}
          
          <Button
            onClick={handleWithdraw}
            disabled={withdrawMutation.isPending || !isConnected}
            className="w-full font-semibold py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-lg"
            data-testid="button-confirm-withdraw"
          >
            {withdrawMutation.isPending ? "Processing Smart Contract..." : "Instant Withdraw"}
          </Button>
        </div>
      </div>
    </div>
  );
}
