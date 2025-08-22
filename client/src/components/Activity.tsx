import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { type Transaction } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Activity() {
  const { user } = useAuth();
  
  const { data, isLoading } = useQuery({
    queryKey: ['/api/user', user?.telegramId],
    enabled: !!user?.telegramId,
  });

  const transactions = (data as any)?.transactions || [];

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'reward':
        return { icon: '📈', bgColor: 'bg-green-100 dark:bg-green-900/30', textColor: 'text-green-600' };
      case 'deposit':
        return { icon: '💰', bgColor: 'bg-blue-100 dark:bg-blue-900/30', textColor: 'text-blue-600' };
      case 'withdraw':
        return { icon: '📤', bgColor: 'bg-red-100 dark:bg-red-900/30', textColor: 'text-red-600' };
      case 'referral_bonus':
        return { icon: '🎁', bgColor: 'bg-purple-100 dark:bg-purple-900/30', textColor: 'text-purple-600' };
      default:
        return { icon: '📄', bgColor: 'bg-gray-100 dark:bg-gray-900/30', textColor: 'text-gray-600' };
    }
  };

  const formatTransactionType = (type: string) => {
    switch (type) {
      case 'reward':
        return 'Daily Rewards';
      case 'deposit':
        return 'Deposit';
      case 'withdraw':
        return 'Withdrawal';
      case 'referral_bonus':
        return 'Referral Bonus';
      default:
        return 'Transaction';
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="activity-tab">
        <h2 className="font-bold text-xl">Activity History</h2>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-4 w-16 mb-1" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="activity-tab">
      <h2 className="font-bold text-xl" data-testid="text-activity-title">Activity History</h2>
      
      {transactions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Make your first deposit to start earning rewards
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction: Transaction) => {
            const { icon, bgColor, textColor } = getTransactionIcon(transaction.type);
            const isPositive = !transaction.type.includes('withdraw');
            
            return (
              <Card key={transaction.id} data-testid={`transaction-${transaction.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center`}>
                        <span className={`${textColor} text-lg`}>{icon}</span>
                      </div>
                      <div>
                        <p className="font-medium" data-testid={`text-transaction-type-${transaction.id}`}>
                          {formatTransactionType(transaction.type)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400" data-testid={`text-transaction-date-${transaction.id}`}>
                          {formatDate(transaction.createdAt!)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`} data-testid={`text-transaction-amount-${transaction.id}`}>
                        {isPositive ? '+' : '-'}{parseFloat(transaction.amount).toFixed(3)} TON
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400" data-testid={`text-transaction-status-${transaction.id}`}>
                        {transaction.status === 'pending' ? 'Processing' : 'Completed'}
                      </p>
                    </div>
                  </div>
                  {transaction.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-13" data-testid={`text-transaction-desc-${transaction.id}`}>
                      {transaction.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
