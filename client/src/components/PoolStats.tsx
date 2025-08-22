import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Star, Target, TrendingUp, Users, Coins } from 'lucide-react';

interface PoolStatsProps {
  onPremiumClick?: () => void;
}

export default function PoolStats({ onPremiumClick }: PoolStatsProps) {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['/api/stats'],
  });

  if (isLoading) {
    return (
      <Card data-testid="pool-stats">
        <CardContent className="p-4">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Skeleton className="h-4 w-20 mx-auto mb-2" />
              <Skeleton className="h-6 w-24 mx-auto" />
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Skeleton className="h-4 w-20 mx-auto mb-2" />
              <Skeleton className="h-6 w-16 mx-auto" />
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Skeleton className="h-4 w-24 mx-auto mb-2" />
            <Skeleton className="h-6 w-16 mx-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalPoolSize = parseFloat((statsData as any)?.totalPoolSize || '0');
  const totalStakers = (statsData as any)?.totalStakers || 0;
  const validatorUptime = (statsData as any)?.validatorUptime || '99.8';

  return (
    <Card className="bg-slate-900 text-white shadow-lg" data-testid="pool-stats">
      <CardContent className="p-6">
        <h3 className="font-semibold text-xl mb-6" data-testid="text-pool-stats-title">
          Pool Statistics
        </h3>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="text-center p-4 bg-blue-900/30 rounded-lg">
            <p className="text-sm text-blue-300 mb-2">Pool Assets</p>
            <p className="text-2xl font-bold" data-testid="text-pool-size">
              {totalPoolSize.toLocaleString()}
            </p>
            <p className="text-sm text-blue-200">TON</p>
          </div>
          <div className="text-center p-4 bg-emerald-900/30 rounded-lg">
            <p className="text-sm text-emerald-300 mb-2">Pool Members</p>
            <p className="text-2xl font-bold" data-testid="text-active-stakers">
              {totalStakers.toLocaleString()}
            </p>
            <p className="text-sm text-emerald-200">Users</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-yellow-900/30 rounded-lg">
            <p className="text-sm text-yellow-300 mb-1">Standard APY</p>
            <p className="text-2xl font-bold text-yellow-100">8.7%</p>
          </div>
          <div 
            className="text-center p-4 bg-purple-900/30 rounded-lg cursor-pointer hover:bg-purple-900/40 transition-colors border border-purple-700/30 hover:border-purple-600/50 select-none"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onPremiumClick) {
                onPremiumClick();
              }
            }}
            data-testid="button-premium-apy"
          >
            <div className="flex items-center justify-center gap-1 mb-1">
              <Crown className="h-4 w-4 text-yellow-400" />
              <p className="text-sm text-purple-300">Premium APY</p>
            </div>
            <p className="text-2xl font-bold text-purple-100">10.5%</p>
            <p className="text-xs text-purple-400 mt-1">Click to unlock</p>
          </div>
        </div>
        
        <div className="text-center p-4 bg-green-900/30 rounded-lg">
          <p className="text-sm text-green-300 mb-2">Validator Uptime</p>
          <p className="text-2xl font-bold" data-testid="text-validator-uptime">
            {validatorUptime}%
          </p>
          <p className="text-sm text-green-200">Online</p>
        </div>
      </CardContent>
    </Card>
  );
}
