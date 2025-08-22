import { getAdminWallet } from './adminWallet';
import { updateFirestorePool, updateUserBalance, logTransaction, getUserData, getAllUsersWithStakes } from './firestoreManager';

export interface ContractConfig {
  address: string;
  apy: number;
  adminCommission: number; // 12%
  referralBonus: number; // 10%
}

export class SmartContractManager {
  private config: ContractConfig;

  constructor(config: ContractConfig) {
    this.config = config;
  }

  /**
   * Process user deposit through smart contract
   */
  async processDeposit(userId: string, amount: string, userWalletAddress: string): Promise<string> {
    try {
      console.log(`🔄 Processing deposit: ${amount} TON for user ${userId}`);
      
      const adminWallet = getAdminWallet();
      
      // 1. Call smart contract to deposit
      const txHash = await adminWallet.depositToContract(
        this.config.address, 
        amount, 
        userWalletAddress
      );

      // 2. Update Firestore
      await this.updateFirestoreForDeposit(userId, amount, userWalletAddress, txHash);

      console.log(`✅ Deposit processed successfully. TX: ${txHash}`);
      return txHash;
    } catch (error) {
      console.error('❌ Failed to process deposit:', error);
      throw error;
    }
  }

  /**
   * Process user withdrawal through smart contract
   */
  async processWithdrawal(userId: string, amount: string, userWalletAddress: string): Promise<string> {
    try {
      console.log(`🔄 Processing withdrawal: ${amount} TON for user ${userId}`);
      
      // 1. Validate user balance
      const userData = await getUserData(userId);
      const availableBalance = parseFloat(userData.stakedAmount || '0') + parseFloat(userData.rewardsBalance || '0');
      
      if (parseFloat(amount) > availableBalance) {
        throw new Error(`Insufficient balance. Available: ${availableBalance}, Requested: ${amount}`);
      }

      const adminWallet = getAdminWallet();
      
      // 2. Call smart contract to withdraw
      const txHash = await adminWallet.withdrawFromContract(
        this.config.address, 
        amount, 
        userWalletAddress
      );

      // 3. Update Firestore
      await this.updateFirestoreForWithdrawal(userId, amount, userWalletAddress, txHash);

      console.log(`✅ Withdrawal processed successfully. TX: ${txHash}`);
      return txHash;
    } catch (error) {
      console.error('❌ Failed to process withdrawal:', error);
      throw error;
    }
  }

  /**
   * Get contract balance and data
   */
  async getContractData(): Promise<any> {
    try {
      const adminWallet = getAdminWallet();
      const contractData = await adminWallet.getContractData(this.config.address);
      
      return {
        totalBalance: contractData.balance,
        contractAddress: this.config.address,
        apy: this.config.apy,
        adminCommission: this.config.adminCommission,
        referralBonus: this.config.referralBonus,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Failed to get contract data:', error);
      throw error;
    }
  }

  /**
   * Calculate and distribute daily rewards
   */
  async distributeRewards(): Promise<void> {
    try {
      console.log('🔄 Starting daily rewards distribution...');
      
      // 1. Get contract balance
      const contractData = await this.getContractData();
      const totalPoolBalance = parseFloat(contractData.totalBalance);
      
      // 2. Get all users with staked amounts
      const users = await getAllUsersWithStakes();
      
      if (users.length === 0) {
        console.log('ℹ️ No users with stakes found');
        return;
      }

      // 3. Calculate total staked amount
      const totalStaked = users.reduce((sum: number, user: any) => sum + parseFloat(user.stakedAmount || '0'), 0);
      
      if (totalStaked === 0) {
        console.log('ℹ️ No total staked amount found');
        return;
      }

      // 4. Calculate daily reward rate (APY / 365)
      const dailyRate = this.config.apy / 100 / 365;
      const grossDailyReward = totalStaked * dailyRate;
      
      // 5. Deduct admin commission (12%)
      const adminCommission = grossDailyReward * this.config.adminCommission;
      const netDailyReward = grossDailyReward - adminCommission;

      console.log(`💰 Daily reward calculation:
        - Total Staked: ${totalStaked} TON
        - Gross Daily Reward: ${grossDailyReward.toFixed(9)} TON
        - Admin Commission (12%): ${adminCommission.toFixed(9)} TON
        - Net Daily Reward: ${netDailyReward.toFixed(9)} TON`);

      // 6. Distribute rewards proportionally
      for (const user of users) {
        await this.distributeUserReward(user, netDailyReward, totalStaked);
      }

      // 7. Update pool statistics
      await updateFirestorePool({
        totalStaked: totalStaked.toString(),
        lastRewardDistribution: new Date().toISOString(),
        dailyRate: dailyRate.toString(),
        adminCommission: adminCommission.toString()
      });

      console.log('✅ Daily rewards distribution completed');
    } catch (error) {
      console.error('❌ Failed to distribute rewards:', error);
      throw error;
    }
  }

  /**
   * Distribute reward to individual user and handle referrals
   */
  private async distributeUserReward(user: any, netDailyReward: number, totalStaked: number): Promise<void> {
    try {
      const userStake = parseFloat(user.stakedAmount || '0');
      const userProportion = userStake / totalStaked;
      const userReward = netDailyReward * userProportion;

      // Credit reward to user
      const newRewardsBalance = parseFloat(user.rewardsBalance || '0') + userReward;
      const newTotalEarnings = parseFloat(user.totalEarnings || '0') + userReward;

      await updateUserBalance(user.id, {
        rewardsBalance: newRewardsBalance.toFixed(9),
        totalEarnings: newTotalEarnings.toFixed(9)
      });

      // Log reward transaction
      await logTransaction({
        userId: user.id,
        type: 'reward',
        amount: userReward.toFixed(9),
        timestamp: new Date().toISOString(),
        status: 'completed',
        description: `Daily staking reward (${(userProportion * 100).toFixed(2)}% of pool)`
      });

      console.log(`💎 Reward distributed: ${userReward.toFixed(9)} TON to user ${user.id}`);

      // Handle referral bonus if user was referred
      if (user.referredBy) {
        await this.processReferralBonus(user.referredBy, userReward, user.id);
      }
    } catch (error) {
      console.error(`❌ Failed to distribute reward to user ${user.id}:`, error);
    }
  }

  /**
   * Process referral bonus (10% of referee's reward)
   */
  private async processReferralBonus(referrerId: string, refereeReward: number, refereeId: string): Promise<void> {
    try {
      const referralBonus = refereeReward * this.config.referralBonus;
      
      // Get referrer data
      const referrerData = await getUserData(referrerId);
      
      // Credit bonus to referrer
      const newRewardsBalance = parseFloat(referrerData.rewardsBalance || '0') + referralBonus;
      const newTotalEarnings = parseFloat(referrerData.totalEarnings || '0') + referralBonus;

      await updateUserBalance(referrerId, {
        rewardsBalance: newRewardsBalance.toFixed(9),
        totalEarnings: newTotalEarnings.toFixed(9)
      });

      // Log referral transaction
      await logTransaction({
        userId: referrerId,
        type: 'referral',
        amount: referralBonus.toFixed(9),
        timestamp: new Date().toISOString(),
        status: 'completed',
        description: `Referral bonus from user ${refereeId} (10% of ${refereeReward.toFixed(9)} TON)`
      });

      console.log(`🎁 Referral bonus: ${referralBonus.toFixed(9)} TON to referrer ${referrerId}`);
    } catch (error) {
      console.error(`❌ Failed to process referral bonus for referrer ${referrerId}:`, error);
    }
  }

  /**
   * Update Firestore for deposit
   */
  private async updateFirestoreForDeposit(userId: string, amount: string, walletAddress: string, txHash: string): Promise<void> {
    try {
      // Get current user data
      const userData = await getUserData(userId);
      
      // Update user balance
      const newStakedAmount = parseFloat(userData.stakedAmount || '0') + parseFloat(amount);
      
      await updateUserBalance(userId, {
        stakedAmount: newStakedAmount.toFixed(9),
        walletAddress: walletAddress
      });

      // Log transaction
      await logTransaction({
        userId,
        type: 'deposit',
        amount,
        timestamp: new Date().toISOString(),
        status: 'completed',
        txHash,
        description: `Staked ${amount} TON to smart contract`
      });

      // Update pool statistics
      const contractData = await this.getContractData();
      await updateFirestorePool({
        totalStaked: contractData.totalBalance,
        lastDeposit: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to update Firestore for deposit:', error);
      throw error;
    }
  }

  /**
   * Update Firestore for withdrawal
   */
  private async updateFirestoreForWithdrawal(userId: string, amount: string, walletAddress: string, txHash: string): Promise<void> {
    try {
      // Get current user data
      const userData = await getUserData(userId);
      
      const currentStaked = parseFloat(userData.stakedAmount || '0');
      const currentRewards = parseFloat(userData.rewardsBalance || '0');
      const withdrawAmount = parseFloat(amount);
      
      // Withdraw from staked amount first, then from rewards
      let newStakedAmount = currentStaked;
      let newRewardsBalance = currentRewards;
      
      if (withdrawAmount <= currentStaked) {
        newStakedAmount = currentStaked - withdrawAmount;
      } else {
        newStakedAmount = 0;
        newRewardsBalance = currentRewards - (withdrawAmount - currentStaked);
      }

      await updateUserBalance(userId, {
        stakedAmount: Math.max(0, newStakedAmount).toFixed(9),
        rewardsBalance: Math.max(0, newRewardsBalance).toFixed(9)
      });

      // Log transaction
      await logTransaction({
        userId,
        type: 'withdraw',
        amount,
        timestamp: new Date().toISOString(),
        status: 'completed',
        txHash,
        description: `Withdrew ${amount} TON from smart contract to ${walletAddress}`
      });

      // Update pool statistics
      const contractData = await this.getContractData();
      await updateFirestorePool({
        totalStaked: contractData.totalBalance,
        lastWithdrawal: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to update Firestore for withdrawal:', error);
      throw error;
    }
  }
}

// TonVera contract configuration
const CONTRACT_CONFIG: ContractConfig = {
  address: process.env.CONTRACT_ADDRESS || 'EQD6zrQz_ZEyJeHEZQg_4-8G5-0k7QpE5SV8Ja5BSfyNjNJ2',
  apy: 8.7, // 8.7% APY  
  adminCommission: 0.12, // 12% commission
  referralBonus: 0.10 // 10% referral bonus (from daily rewards)
};

// Singleton instance
let contractManagerInstance: SmartContractManager | null = null;

/**
 * Get smart contract manager instance
 */
export function getContractManager(): SmartContractManager {
  if (!contractManagerInstance) {
    contractManagerInstance = new SmartContractManager(CONTRACT_CONFIG);
  }
  return contractManagerInstance;
}