import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import DepositModal from "./DepositModal";
import WithdrawModal from "./WithdrawModal";

export default function StakingOverview() {
  const { user } = useAuth();
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['/api/user', user?.telegramId],
    enabled: !!user?.telegramId,
    retry: false, // Don't retry on 404 errors
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
  });

  const { data: statsData } = useQuery({
    queryKey: ['/api/stats'],
  });

  if (isLoading) {
    return (
      <Card className="bg-slate-900 text-white shadow-lg">
        <CardContent className="p-6">
          <Skeleton className="h-6 w-48 mb-4 bg-white/20" />
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center">
              <Skeleton className="h-4 w-24 mb-2 bg-white/20 mx-auto" />
              <Skeleton className="h-8 w-32 bg-white/20 mx-auto" />
            </div>
            <div className="text-center">
              <Skeleton className="h-4 w-24 mb-2 bg-white/20 mx-auto" />
              <Skeleton className="h-8 w-32 bg-white/20 mx-auto" />
            </div>
          </div>
          <Skeleton className="h-20 w-full mb-4 bg-white/20" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-12 bg-white/20" />
            <Skeleton className="h-12 bg-white/20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const userData = (data as any)?.user;
  const totalStaked = parseFloat(userData?.totalStaked || '0');
  const totalEarned = parseFloat(userData?.totalEarned || '0');
  const netApy = (statsData as any)?.netApy || '8.7';
  
  // Calculate daily rewards based on current stake
  const dailyRewards = totalStaked * (parseFloat(netApy) / 100 / 365);
  
  // Calculate next reward time (24 hours from now in a real app)
  const nextRewardTime = "14h 23m";

  return (
    <>
      <Card className="bg-slate-900 text-white shadow-lg" data-testid="staking-overview">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-xl" data-testid="text-staking-title">
              Your Pool Position
            </h3>
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="text-center">
              <p className="text-sm text-white/70 mb-2">Pool Balance</p>
              <p className="text-3xl font-bold" data-testid="text-total-staked">
                {totalStaked.toFixed(2)}
              </p>
              <p className="text-sm text-white/60">TON</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-white/70 mb-2">Daily Returns</p>
              <p className="text-2xl font-bold text-emerald-400" data-testid="text-daily-rewards">
                +{dailyRewards.toFixed(4)}
              </p>
              <p className="text-sm text-white/60">TON/day</p>
            </div>
          </div>

          <div className="bg-white/10 rounded-lg p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm font-medium">Pool Status</span>
              </div>
              <span className="text-xs bg-green-500 text-green-900 px-2 py-1 rounded-full font-semibold">
                Auto-Compounding
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Next reward in</span>
                <span className="font-semibold">{nextRewardTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/80">APY Rate</span>
                <span className="font-semibold text-green-300">{netApy}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Total Earned</span>
                <span className="font-semibold text-yellow-300" data-testid="text-total-earned">
                  +{totalEarned.toFixed(4)} TON
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => setShowDeposit(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
              data-testid="button-deposit"
            >
              Deposit TON
            </Button>
            <Button 
              onClick={() => setShowWithdraw(true)}
              variant="outline"
              className="border-gray-600 hover:border-gray-500 text-white hover:bg-white/10 font-semibold py-3"
              disabled={totalStaked === 0}
              data-testid="button-withdraw"
            >
              Withdraw
            </Button>
          </div>
        </CardContent>
      </Card>

      {showDeposit && (
        <DepositModal 
          onClose={() => setShowDeposit(false)}
          currentStaked={totalStaked}
        />
      )}

      {showWithdraw && (
        <WithdrawModal 
          onClose={() => setShowWithdraw(false)}
          availableAmount={totalStaked}
        />
      )}
    </>
  );
}
