import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface GamefiedBoostsProps {
  onPremiumClick?: () => void;
}

export default function GamefiedBoosts({ onPremiumClick }: GamefiedBoostsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Fetch real referral statistics
  const { data: userData } = useQuery({
    queryKey: ['/api/user', user?.telegramId],
    enabled: !!user?.telegramId,
    refetchInterval: 30000, // Refetch every 30 seconds instead of 5
    refetchIntervalInBackground: false, // Don't refetch when tab is not active
    retry: false, // Don't retry on 404 errors
  });
  
  const referralStats = (userData as any)?.referralStats || { count: 0, totalEarned: '0' };
  
  const handleUpgradePremium = () => {
    if (onPremiumClick) {
      onPremiumClick();
    } else {
      // Fallback scroll if no prop passed
      setTimeout(() => {
        const premiumElement = document.getElementById('premium-unlock-section') || 
                             document.querySelector('[data-testid="premium-unlock"]') ||
                             document.querySelector('[data-testid="premium-active"]');
        
        if (premiumElement) {
          premiumElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  // Calculate early staker bonus (based on join date)
  const joinDate = user?.joinedAt ? new Date(user.joinedAt) : new Date();
  const daysSinceJoin = Math.floor((Date.now() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
  const isEarlyStaker = daysSinceJoin <= 7;
  const earlyStakerBonus = Math.max(0, (7 - daysSinceJoin) * 0.1);

  return (
    <Card data-testid="gamified-boosts">
      <CardContent className="p-4">
        <h3 className="font-semibold text-xl mb-6" data-testid="text-boosts-title">Pool Benefits</h3>
        
        <div className="space-y-3">
          {/* Pool Member Status */}
          <div className="p-5 bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 rounded-2xl border border-blue-200 dark:border-blue-800" data-testid="boost-pool-member">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🌟</span>
                <div>
                  <p className="text-lg font-bold text-blue-800 dark:text-blue-200">Pool Member</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">Auto-compounding rewards daily</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">8.7%</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">APY</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-blue-200 dark:border-blue-700">
              <div className="text-center">
                <p className="text-xs text-blue-600 dark:text-blue-400">Pool Safety</p>
                <p className="font-semibold text-blue-700 dark:text-blue-300">99.8%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-blue-600 dark:text-blue-400">Daily Rewards</p>
                <p className="font-semibold text-blue-700 dark:text-blue-300">Automatic</p>
              </div>
            </div>
          </div>
          
          {/* Premium Benefits */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl border border-purple-200 dark:border-purple-800" data-testid="boost-premium">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-3xl">💎</span>
                <div>
                  <p className="text-lg font-bold text-purple-800 dark:text-purple-200">
                    {user?.isPremium ? 'Premium Pool Access' : 'Premium Benefits'}
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    {user?.isPremium ? 'Enhanced returns & priority support' : 'Unlock higher returns & exclusive features'}
                  </p>
                </div>
              </div>
              {user?.isPremium ? (
                <div className="text-right">
                  <p className="text-xl font-bold text-purple-600" data-testid="text-premium-active">10.7%</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">APY</p>
                </div>
              ) : (
                <Button
                  onClick={handleUpgradePremium}
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold px-4 py-2 rounded-xl hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  data-testid="button-upgrade-premium"
                >
                  Unlock
                </Button>
              )}
            </div>
          </div>
          
          {/* Referral Rewards */}
          <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-2xl border border-orange-200 dark:border-orange-800" data-testid="boost-referral-streak">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎁</span>
                <div>
                  <p className="font-bold text-orange-800 dark:text-orange-200">Referral Rewards</p>
                  <p className="text-sm text-orange-600 dark:text-orange-400">Earn 10% of friends' returns</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-orange-600 dark:text-orange-300" data-testid="text-referral-progress">
                  {referralStats?.count || 0}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400">Friends</p>
              </div>
            </div>
          </div>

          {/* Pool Performance */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200 dark:border-green-800" data-testid="boost-login-streak">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <p className="font-bold text-green-800 dark:text-green-200">Smart Pool Strategy</p>
                  <p className="text-sm text-green-600 dark:text-green-400">Optimized validator selection</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-600 dark:text-green-300" data-testid="text-login-streak">Active</p>
                <p className="text-xs text-green-600 dark:text-green-400">24/7</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
