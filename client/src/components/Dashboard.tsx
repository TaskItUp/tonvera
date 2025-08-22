import WalletConnection from "./WalletConnection";
import StakingOverview from "./StakingOverview";
import PoolStats from "./PoolStats";
import RewardsChart from "./RewardsChart";
import GamefiedBoosts from "./GamefiedBoosts";
import { PremiumUnlock } from "./PremiumUnlock";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { user } = useAuth();
  
  const scrollToPremium = () => {
    // Try multiple methods to find and scroll to premium section
    setTimeout(() => {
      const premiumElement = document.getElementById('premium-unlock-section') || 
                           document.querySelector('[data-testid="premium-unlock"]') ||
                           document.querySelector('[data-testid="premium-active"]');
      
      if (premiumElement) {
        premiumElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };
  
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6" data-testid="dashboard-tab">
      <WalletConnection />
      <StakingOverview />
      <PoolStats onPremiumClick={scrollToPremium} />
      <div id="premium-unlock-section">
        {user?.telegramId && <PremiumUnlock telegramId={user.telegramId} />}
      </div>
      <RewardsChart />
      <GamefiedBoosts onPremiumClick={scrollToPremium} />
      
      {/* How It Works Section */}
      <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700" data-testid="how-it-works">
        <h3 className="font-bold text-xl mb-4 text-center text-blue-900 dark:text-blue-100">🚀 How Our Staking Platform Works</h3>
        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
          <div className="border-l-4 border-blue-500 pl-4">
            <p><span className="font-semibold text-blue-700 dark:text-blue-300">🔗 Smart Contract Integration:</span> Connect your TON wallet to interact directly with our secure smart contracts. Enter your desired deposit amount and confirm the transaction through your wallet interface.</p>
          </div>
          
          <div className="border-l-4 border-green-500 pl-4">
            <p><span className="font-semibold text-green-700 dark:text-green-300">📈 Automated Pool Management:</span> Your TON is automatically allocated to our high-performance staking pool, optimizing returns through strategic validator selection and advanced yield farming strategies.</p>
          </div>
          
          <div className="border-l-4 border-purple-500 pl-4">
            <p><span className="font-semibold text-purple-700 dark:text-purple-300">💎 Daily Compound Returns:</span> Earn competitive 8.7% APY (or 10.5% with Premium) with automatic daily compounding. All rewards are reinvested to maximize your long-term growth potential without any manual intervention required.</p>
          </div>
          
          <div className="border-l-4 border-orange-500 pl-4">
            <p><span className="font-semibold text-orange-700 dark:text-orange-300">⚡ Liquidity Management:</span> Our advanced liquidity pool ensures instant withdrawals without traditional validator unstaking delays. Access your funds immediately when needed through our smart contract interface.</p>
          </div>
          
          <div className="border-l-4 border-pink-500 pl-4">
            <p><span className="font-semibold text-pink-700 dark:text-pink-300">🎁 Referral Ecosystem:</span> Earn perpetual 10% bonuses from your network's daily rewards. Our referral system creates sustainable passive income streams through smart contract-based distribution mechanisms.</p>
          </div>
          
          <div className="border-l-4 border-indigo-500 pl-4">
            <p><span className="font-semibold text-indigo-700 dark:text-indigo-300">🔐 Enterprise Security:</span> Multi-signature smart contracts, real-time monitoring systems, and transparent on-chain operations ensure maximum security and complete fund protection with institutional-grade safeguards.</p>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/40 rounded-lg border border-blue-300 dark:border-blue-600">
          <p className="text-xs text-blue-800 dark:text-blue-200 text-center font-medium">
            🔍 All transactions are transparent and verifiable on the TON blockchain. Smart contracts are audited and open-source for complete transparency.
          </p>
        </div>
      </div>
    </div>
  );
}
