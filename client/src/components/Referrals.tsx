import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function Referrals() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { data, isLoading } = useQuery({
    queryKey: ['/api/user', user?.telegramId],
    enabled: !!user?.telegramId,
    retry: false, // Don't retry on 404 errors
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
  });

  const referralStats = (data as any)?.referralStats || { count: 0, totalEarned: '0' };
  const referralLink = user?.referralCode ? 
    `https://t.me/tonverabot?start=${user.referralCode}` : '';

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      toast({
        title: "Copied!",
        description: "Referral link copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-6" data-testid="referrals-tab">
        <div className="text-center">
          <Skeleton className="h-6 w-32 mx-auto mb-2" />
          <Skeleton className="h-4 w-48 mx-auto mb-6" />
        </div>
        
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-16 w-full mb-4" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-6 w-32 mb-3" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6" data-testid="referrals-tab">
      <div className="text-center">
        <h2 className="font-bold text-xl mb-2" data-testid="text-referrals-title">Invite Friends</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-6" data-testid="text-referrals-description">
          Earn 10% of your referrals' rewards
        </p>
      </div>
      
      <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
        <CardContent className="p-6 text-center">
          <h3 className="font-semibold text-lg mb-2" data-testid="text-referral-stats-title">Your Referral Stats</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-2xl font-bold" data-testid="text-referral-count">
                {referralStats.count}
              </p>
              <p className="text-sm opacity-90">Total Referrals</p>
            </div>
            <div>
              <p className="text-2xl font-bold" data-testid="text-referral-earned">
                {parseFloat(referralStats.totalEarned).toFixed(2)} TON
              </p>
              <p className="text-sm opacity-90">Total Earned</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3" data-testid="text-referral-link-title">Your Referral Link</h3>
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border">
            <Input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 bg-transparent text-sm font-mono border-0 focus:ring-0 p-0"
              data-testid="input-referral-link"
            />
            <Button
              onClick={copyReferralLink}
              size="sm"
              className="bg-ton-blue text-white px-3 py-1 rounded text-sm hover:bg-ton-blue/80 transition-colors"
              data-testid="button-copy-referral"
            >
              Copy
            </Button>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>How it works:</strong> When someone joins using your link and makes their first deposit of 1+ TON, you'll earn 10% of their rewards as a bonus!
            </p>
          </div>
        </CardContent>
      </Card>
      
      {referralStats.count > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3" data-testid="text-recent-referrals-title">Recent Referrals</h3>
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🎯</div>
              <p className="text-gray-500 dark:text-gray-400">Referral details coming soon</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Keep sharing your link to earn more rewards!
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
