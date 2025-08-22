import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import { TonClient, Address } from '@ton/ton';

export interface UserData {
  id: string;
  walletAddress?: string;
  stakedAmount: string;
  rewardsBalance: string;
  referralCode: string;
  referredBy?: string;
  totalEarnings: string;
  joinedAt: string;
}

export interface TransactionData {
  id?: string;
  userId: string;
  type: 'deposit' | 'withdraw' | 'reward' | 'referral';
  amount: string;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  txHash?: string;
  description: string;
}

export interface PoolData {
  totalStaked: string;
  totalRewards: string;
  dailyRate: string;
  adminWallet: string;
  lastRewardDistribution?: string;
  lastDeposit?: string;
  lastWithdrawal?: string;
  adminCommission?: string;
}

class FirestoreManager {
  private db: Firestore;

  constructor() {
    // Initialize Firebase Admin SDK
    if (getApps().length === 0) {
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!serviceAccountKey) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is required');
      }

      const serviceAccount = JSON.parse(serviceAccountKey);
      
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    }

    this.db = getFirestore();
    this.initializeCollections();
  }

  /**
   * Initialize Firestore collections with default data
   */
  private async initializeCollections(): Promise<void> {
    try {
      // Initialize pool collection
      const poolRef = this.db.collection('pool').doc('main');
      const poolDoc = await poolRef.get();
      
      if (!poolDoc.exists) {
        await poolRef.set({
          totalStaked: '0',
          totalRewards: '0',
          dailyRate: '0.000238356164383562', // 8.7% APY / 365
          adminWallet: process.env.ADMIN_WALLET_ADDRESS || '',
          createdAt: new Date().toISOString(),
          lastRewardDistribution: null,
          adminCommission: '0'
        });
        console.log('✅ Pool collection initialized');
      }

      console.log('✅ Firestore collections verified');
    } catch (error) {
      console.error('❌ Failed to initialize Firestore collections:', error);
    }
  }

  /**
   * Get user data or create if doesn't exist
   */
  async getUserData(userId: string): Promise<UserData> {
    try {
      const userRef = this.db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        // Create new user with referral code
        const referralCode = this.generateReferralCode(userId);
        const userData: UserData = {
          id: userId,
          stakedAmount: '0',
          rewardsBalance: '0',
          referralCode,
          totalEarnings: '0',
          joinedAt: new Date().toISOString()
        };

        await userRef.set(userData);
        console.log(`✅ New user created: ${userId} with referral code: ${referralCode}`);
        return userData;
      }

      return { id: userId, ...userDoc.data() } as UserData;
    } catch (error) {
      console.error(`❌ Failed to get user data for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update user balance and data
   */
  async updateUserBalance(userId: string, updates: Partial<UserData>): Promise<void> {
    try {
      const userRef = this.db.collection('users').doc(userId);
      await userRef.update({
        ...updates,
        updatedAt: new Date().toISOString()
      });
      console.log(`✅ User balance updated for ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to update user balance for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Process referral registration
   */
  async processReferral(userId: string, referralCode: string): Promise<boolean> {
    try {
      // Find referrer by referral code
      const usersQuery = await this.db.collection('users')
        .where('referralCode', '==', referralCode)
        .limit(1)
        .get();

      if (usersQuery.empty) {
        console.log(`⚠️ Referral code not found: ${referralCode}`);
        return false;
      }

      const referrerDoc = usersQuery.docs[0];
      const referrerId = referrerDoc.id;

      if (referrerId === userId) {
        console.log(`⚠️ User cannot refer themselves: ${userId}`);
        return false;
      }

      // Update user with referrer
      await this.updateUserBalance(userId, { referredBy: referrerId });
      
      console.log(`✅ Referral processed: ${userId} referred by ${referrerId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to process referral for ${userId}:`, error);
      return false;
    }
  }

  /**
   * Log transaction
   */
  async logTransaction(transaction: TransactionData): Promise<string> {
    try {
      const transactionRef = await this.db.collection('transactions').add({
        ...transaction,
        timestamp: new Date().toISOString()
      });

      console.log(`✅ Transaction logged: ${transactionRef.id} - ${transaction.type} ${transaction.amount} TON`);
      return transactionRef.id;
    } catch (error) {
      console.error('❌ Failed to log transaction:', error);
      throw error;
    }
  }

  /**
   * Get user transaction history
   */
  async getTransactionHistory(userId: string, limit: number = 50): Promise<TransactionData[]> {
    try {
      const transactionsQuery = await this.db.collection('transactions')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return transactionsQuery.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as TransactionData[];
    } catch (error) {
      console.error(`❌ Failed to get transaction history for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get all users with stakes for reward distribution
   */
  async getAllUsersWithStakes(): Promise<UserData[]> {
    try {
      const usersQuery = await this.db.collection('users')
        .where('stakedAmount', '>', '0')
        .get();

      return usersQuery.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as UserData[];
    } catch (error) {
      console.error('❌ Failed to get users with stakes:', error);
      throw error;
    }
  }

  /**
   * Update pool statistics
   */
  async updatePool(updates: Partial<PoolData>): Promise<void> {
    try {
      const poolRef = this.db.collection('pool').doc('main');
      await poolRef.update({
        ...updates,
        updatedAt: new Date().toISOString()
      });
      console.log('✅ Pool statistics updated');
    } catch (error) {
      console.error('❌ Failed to update pool statistics:', error);
      throw error;
    }
  }

  /**
   * Get pool statistics
   */
  async getPoolData(): Promise<PoolData> {
    try {
      const poolRef = this.db.collection('pool').doc('main');
      const poolDoc = await poolRef.get();
      
      if (!poolDoc.exists) {
        throw new Error('Pool data not found');
      }

      return poolDoc.data() as PoolData;
    } catch (error) {
      console.error('❌ Failed to get pool data:', error);
      throw error;
    }
  }

  /**
   * Generate unique referral code
   */
  private generateReferralCode(userId: string): string {
    const timestamp = Date.now().toString(36);
    const userHash = userId.slice(-4);
    const random = Math.random().toString(36).substr(2, 4);
    return `${userHash}${timestamp}${random}`.toUpperCase();
  }

  /**
   * Get all users (for admin purposes)
   */
  async getAllUsers(): Promise<UserData[]> {
    try {
      const usersQuery = await this.db.collection('users').get();
      return usersQuery.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as UserData[];
    } catch (error) {
      console.error('❌ Failed to get all users:', error);
      throw error;
    }
  }

  /**
   * Calculate total referral earnings for a user
   */
  async calculateReferralEarnings(userId: string): Promise<number> {
    try {
      const referralTransactions = await this.db.collection('transactions')
        .where('userId', '==', userId)
        .where('type', '==', 'referral')
        .get();

      return referralTransactions.docs.reduce((total: number, doc: any) => {
        return total + parseFloat(doc.data().amount);
      }, 0);
    } catch (error) {
      console.error(`❌ Failed to calculate referral earnings for ${userId}:`, error);
      return 0;
    }
  }
}

// Singleton instance
let firestoreManagerInstance: FirestoreManager | null = null;

/**
 * Get Firestore manager instance
 */
function getFirestoreManager(): FirestoreManager {
  if (!firestoreManagerInstance) {
    firestoreManagerInstance = new FirestoreManager();
  }
  return firestoreManagerInstance;
}

// Export functions
export async function getUserData(userId: string): Promise<UserData> {
  return getFirestoreManager().getUserData(userId);
}

export async function updateUserBalance(userId: string, updates: Partial<UserData>): Promise<void> {
  return getFirestoreManager().updateUserBalance(userId, updates);
}

export async function processReferral(userId: string, referralCode: string): Promise<boolean> {
  return getFirestoreManager().processReferral(userId, referralCode);
}

export async function logTransaction(transaction: TransactionData): Promise<string> {
  return getFirestoreManager().logTransaction(transaction);
}

export async function getTransactionHistory(userId: string, limit?: number): Promise<TransactionData[]> {
  return getFirestoreManager().getTransactionHistory(userId, limit);
}

export async function getAllUsersWithStakes(): Promise<UserData[]> {
  return getFirestoreManager().getAllUsersWithStakes();
}

export async function updateFirestorePool(updates: Partial<PoolData>): Promise<void> {
  return getFirestoreManager().updatePool(updates);
}

export async function getPoolData(): Promise<PoolData> {
  return getFirestoreManager().getPoolData();
}

export async function getAllUsers(): Promise<UserData[]> {
  return getFirestoreManager().getAllUsers();
}

export async function calculateReferralEarnings(userId: string): Promise<number> {
  return getFirestoreManager().calculateReferralEarnings(userId);
}

/**
 * Verify premium payment by checking transaction on blockchain
 */
export async function verifyPremiumPayment(txHash: string, expectedAmount: string): Promise<boolean> {
  try {
    console.log(`🔍 Verifying premium payment: ${txHash} for ${expectedAmount} TON`);
    
    // Import here to avoid circular dependency
    const { getAdminWallet } = await import('./adminWallet');
    
    const tonClient = new TonClient({
      endpoint: 'https://toncenter.com/api/v2/jsonRPC'
    });
    
    const adminWallet = getAdminWallet();
    const adminAddress = adminWallet.wallet.address;
    
    // Get transaction details from blockchain
    const transactions = await tonClient.getTransactions(adminAddress, { limit: 100 });
    
    for (const tx of transactions) {
      const txHashHex = tx.hash().toString('hex');
      
      if (txHashHex === txHash || txHashHex.toLowerCase() === txHash.toLowerCase()) {
        // Check if transaction is incoming and matches amount
        const inMsg = tx.inMessage;
        if (inMsg && inMsg.info.type === 'internal') {
          const amount = parseFloat((parseFloat(inMsg.info.value.coins.toString()) / 1e9).toFixed(2));
          const requiredAmount = parseFloat(expectedAmount);
          
          console.log(`💰 Transaction found: ${amount} TON, required: ${requiredAmount} TON`);
          
          if (Math.abs(amount - requiredAmount) < 0.01) { // Allow small precision differences
            console.log('✅ Payment verification successful');
            return true;
          }
        }
      }
    }
    
    console.log('❌ Payment verification failed - transaction not found or amount mismatch');
    return false;
  } catch (error) {
    console.error('❌ Payment verification error:', error);
    return false;
  }
}

/**
 * Create premium subscription record
 */
export async function createPremiumSubscription(subscriptionData: any): Promise<any> {
  try {
    const docRef = await getFirestoreManager().db.collection('premiumSubscriptions').add({
      ...subscriptionData,
      createdAt: new Date()
    });
    
    console.log(`✅ Premium subscription created: ${docRef.id}`);
    return { id: docRef.id, ...subscriptionData };
  } catch (error) {
    console.error('❌ Failed to create premium subscription:', error);
    throw error;
  }
}

/**
 * Update user premium status
 */
export async function updateUserPremiumStatus(
  telegramId: string, 
  isPremium: boolean, 
  expiresAt: Date | null, 
  rate: string
): Promise<void> {
  try {
    const userRef = getFirestoreManager().db.collection('users').doc(telegramId);
    await userRef.update({
      isPremium,
      premiumExpiresAt: expiresAt,
      premiumRate: rate,
      updatedAt: new Date()
    });
    
    // Log premium status change
    await getFirestoreManager().db.collection('transactions').add({
      telegramId,
      type: 'premium_payment',
      amount: isPremium ? 2.0 : 0,
      status: 'completed',
      description: isPremium ? 'Premium subscription activated' : 'Premium subscription expired',
      createdAt: new Date()
    });
    
    console.log(`✅ User ${telegramId} premium status updated: ${isPremium ? 'ACTIVE' : 'INACTIVE'}`);
  } catch (error) {
    console.error('❌ Failed to update user premium status:', error);
    throw error;
  }
}

/**
 * Distribute rewards with premium user benefits (automated)
 */
export async function distributeRewards(): Promise<void> {
  try {
    console.log('🔄 Starting automated rewards distribution with premium benefits...');
    
    // Get all users with stakes
    const users = await getFirestoreManager().getAllUsersWithStakes();
    
    if (users.length === 0) {
      console.log('ℹ️ No users with stakes found');
      return;
    }

    // Calculate total staked amount
    const totalStaked = users.reduce((sum: number, user: any) => 
      sum + parseFloat(user.stakedAmount || '0'), 0);
    
    if (totalStaked === 0) {
      console.log('ℹ️ No total staked amount found');
      return;
    }

    console.log(`💰 Total staked: ${totalStaked} TON across ${users.length} users`);

    // Calculate rewards for each user based on their premium status
    for (const user of users) {
      await distributeUserRewardWithPremium(user, totalStaked);
    }

    // Update pool statistics
    await getFirestoreManager().updatePool({
      totalStaked: totalStaked.toString(),
      lastRewardDistribution: new Date().toISOString()
    });

    console.log('✅ Automated rewards distribution with premium benefits completed');
  } catch (error) {
    console.error('❌ Failed to distribute rewards:', error);
    throw error;
  }
}

/**
 * Distribute reward to individual user with premium benefits
 */
async function distributeUserRewardWithPremium(user: any, totalStaked: number): Promise<void> {
  try {
    const userStake = parseFloat(user.stakedAmount || '0');
    
    // Check if user is premium and not expired
    const now = new Date();
    const isPremium = user.isPremium && 
      (!user.premiumExpiresAt || new Date(user.premiumExpiresAt) > now);
    
    // Auto-expire premium if needed
    if (user.isPremium && user.premiumExpiresAt && new Date(user.premiumExpiresAt) < now) {
      await updateUserPremiumStatus(user.id, false, null, '8.7');
      console.log(`⏰ Premium expired for user ${user.id}`);
    }
    
    // Determine APY rate based on premium status
    const apyRate = isPremium ? 0.105 : 0.087; // 10.5% vs 8.7%
    const dailyRate = apyRate / 365;
    const userReward = userStake * dailyRate;

    // Deduct admin commission (12% hidden from users)
    const adminCommission = userReward * 0.12;
    const netUserReward = userReward - adminCommission;

    // Credit reward to user
    const newRewardsBalance = parseFloat(user.rewardsBalance || '0') + netUserReward;
    const newTotalEarnings = parseFloat(user.totalEarnings || '0') + netUserReward;

    await getFirestoreManager().updateUserBalance(user.id, {
      rewardsBalance: newRewardsBalance.toFixed(9),
      totalEarnings: newTotalEarnings.toFixed(9)
    });

    // Log reward transaction
    await getFirestoreManager().logTransaction({
      userId: user.id,
      type: 'reward',
      amount: netUserReward.toFixed(9),
      timestamp: new Date().toISOString(),
      status: 'completed',
      description: `Daily staking reward ${isPremium ? '(Premium 10.5% APY)' : '(Standard 8.7% APY)'}`
    });

    console.log(`💎 Reward distributed: ${netUserReward.toFixed(9)} TON to user ${user.id} ${isPremium ? '(PREMIUM)' : '(STANDARD)'}`);

    // Handle referral bonus if user was referred
    if (user.referredBy) {
      await processReferralBonus(user.referredBy, netUserReward, user.id);
    }
  } catch (error) {
    console.error(`❌ Failed to distribute reward to user ${user.id}:`, error);
  }
}

/**
 * Process referral bonus (10% of referee's reward)
 */
async function processReferralBonus(referrerId: string, refereeReward: number, refereeId: string): Promise<void> {
  try {
    const referralBonus = refereeReward * 0.10; // 10% referral bonus
    
    // Get referrer data
    const referrerData = await getFirestoreManager().getUserData(referrerId);
    
    // Credit bonus to referrer
    const newRewardsBalance = parseFloat(referrerData.rewardsBalance || '0') + referralBonus;
    const newTotalEarnings = parseFloat(referrerData.totalEarnings || '0') + referralBonus;

    await getFirestoreManager().updateUserBalance(referrerId, {
      rewardsBalance: newRewardsBalance.toFixed(9),
      totalEarnings: newTotalEarnings.toFixed(9)
    });

    // Log referral transaction
    await getFirestoreManager().logTransaction({
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