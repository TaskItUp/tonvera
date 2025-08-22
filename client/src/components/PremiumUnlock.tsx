import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Crown, TrendingUp, Clock, Star, Check, Copy, Zap, Gift, Target, Sparkles, Diamond, Rocket, Shield, Infinity } from 'lucide-react';

interface PremiumStatus {
  isPremium: boolean;
  premiumExpiresAt?: string;
  premiumRate: string;
  standardRate: string;
  premiumBenefit: string;
  monthlyCost: string;
}

interface PremiumUnlockProps {
  telegramId: string;
}

export function PremiumUnlock({ telegramId }: PremiumUnlockProps) {
  const [txHash, setTxHash] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const { toast } = useToast();
  
  // Admin wallet address for payments
  const ADMIN_WALLET = 'UQDgQSgJWD7wMAh_abFcA4Zt2Z6nYOjDQim_dn5hqLWZ2mzi';

  // Get premium status
  const { data: premiumStatus, isLoading: statusLoading, refetch } = useQuery<PremiumStatus>({
    queryKey: [`/api/premium/status/${telegramId}`],
    enabled: !!telegramId
  });

  // Premium unlock mutation
  const unlockMutation = useMutation({
    mutationFn: async ({ telegramId, txHash }: { telegramId: string; txHash: string }) => {
      return await apiRequest(`/api/premium/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegramId, txHash }),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "🎉 Premium Activated!",
        description: "Welcome to Premium! You now earn 10.5% APY with exclusive benefits!",
      });
      setTxHash('');
      setIsUnlocking(false);
      setShowPaymentStep(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: [`/api/users/${telegramId}`] });
    },
    onError: (error) => {
      toast({
        title: "Activation Failed",
        description: error instanceof Error ? error.message : 'Payment verification failed. Please check your transaction hash.',
        variant: "destructive",
      });
    },
  });

  const handleStartUnlock = () => {
    setIsUnlocking(true);
    setShowPaymentStep(true);
  };

  const handleVerifyPayment = () => {
    if (!txHash.trim()) {
      toast({
        title: "Transaction Hash Required",
        description: "Please enter the transaction hash from your payment",
        variant: "destructive",
      });
      return;
    }

    unlockMutation.mutate({ telegramId, txHash: txHash.trim() });
  };

  const copyWalletAddress = () => {
    navigator.clipboard.writeText(ADMIN_WALLET);
    toast({
      title: "✅ Copied!",
      description: "Admin wallet address copied to clipboard",
    });
  };

  const formatExpiryDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (statusLoading) {
    return (
      <Card className="overflow-hidden" data-testid="premium-loading">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-3/4"></div>
            <div className="h-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded w-1/2"></div>
            <div className="h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (premiumStatus?.isPremium) {
    return (
      <Card className="border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20" data-testid="premium-active">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
              <Crown className="h-5 w-5 text-yellow-600" />
              <span className="text-lg font-semibold">Premium Active</span>
            </CardTitle>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
              <Star className="h-3 w-3 mr-1" />
              {premiumStatus.premiumRate}% APY
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Your Rate</span>
                <span className="font-semibold text-green-600">{premiumStatus.premiumRate}%</span>
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Standard</span>
                <span className="text-gray-500 line-through">{premiumStatus.standardRate}%</span>
              </div>
            </div>
          </div>

          {premiumStatus.premiumExpiresAt && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Expires: {formatExpiryDate(premiumStatus.premiumExpiresAt)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-700">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              ✅ Earning 1.8% more than standard users
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="premium-unlock">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <span className="text-lg font-semibold">Unlock Premium</span>
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            2 TON/month
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            Premium Benefits
          </h4>
          
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">Higher APY</p>
                  <p className="text-sm text-green-700 dark:text-green-300">Earn more on every stake</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">10.5%</div>
                <div className="text-sm text-gray-500 line-through">8.7%</div>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Earn 1.8% more annually on your staked TON
          </div>
        </div>

        <Separator className="my-6" />

        {/* Action Section */}
        {!showPaymentStep ? (
          <div className="space-y-3">
            <Button 
              onClick={handleStartUnlock}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              data-testid="button-start-unlock"
            >
              <Crown className="h-4 w-4 mr-2" />
              Unlock Premium (2 TON/month)
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Payment Instructions */}
            <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl border-2 border-blue-200 dark:border-blue-700">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-bold text-blue-900 dark:text-blue-100 text-lg">Payment Instructions</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">Follow these steps to activate Premium</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">1</div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">Send exactly <strong className="text-blue-900 dark:text-blue-100">2 TON</strong> to the admin wallet</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">2</div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">Copy the transaction hash from your wallet</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">3</div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">Paste it below and verify instantly</p>
                </div>
              </div>
            </div>

            {/* Wallet Address */}
            <div className="space-y-3">
              <Label htmlFor="wallet-address" className="text-base font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Admin Wallet Address
              </Label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <Input
                  id="wallet-address"
                  value={ADMIN_WALLET}
                  readOnly
                  className="font-mono text-xs bg-transparent border-0 focus:ring-0"
                  data-testid="input-wallet-address"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyWalletAddress}
                  className="shrink-0 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  data-testid="button-copy-address"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Transaction Hash Input */}
            <div className="space-y-3">
              <Label htmlFor="tx-hash" className="text-base font-semibold flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                Transaction Hash
              </Label>
              <Input
                id="tx-hash"
                placeholder="Paste your transaction hash here..."
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                className="font-mono text-sm h-12 bg-white dark:bg-gray-800 border-2 focus:border-blue-400 transition-colors"
                data-testid="input-tx-hash"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleVerifyPayment}
                disabled={!txHash.trim() || unlockMutation.isPending}
                className="flex-1 h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                data-testid="button-verify-payment"
              >
                {unlockMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-current border-r-transparent rounded-full" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    <span>Verify Payment</span>
                  </div>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => {
                  setShowPaymentStep(false);
                  setTxHash('');
                }}
                className="h-12 px-6 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                data-testid="button-cancel-unlock"
              >
                Cancel
              </Button>
            </div>

            {/* Security Notice */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Shield className="h-4 w-4" />
                <span className="font-medium">Secure blockchain verification</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your payment is automatically verified on the TON blockchain for maximum security
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}