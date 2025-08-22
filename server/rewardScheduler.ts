import * as cron from 'node-cron';
import { FirebaseStorage } from './firebaseStorage';
import { fetchValidatorRewards } from './tonstakeApi';
import { getAdminWalletBalance, getAdminWalletAddress } from './tonhubWalletSimple';
import { collection, getDocs, updateDoc, doc, setDoc, Timestamp, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { sendReferralBonusNotification, sendDailyRewardsNotification } from './telegramBot';

const ADMIN_COMMISSION_RATE = 0.12; // 12% admin commission
const REFERRAL_BONUS_RATE = 0.10; // 10% referral bonus
const storage = new FirebaseStorage();

// Calculate and distribute daily rewards with full automation
export async function calculateAndDistributeRewards(): Promise<void> {
  console.log('🚀 Starting automated daily reward calculation...');
  
  try {
    // Step 1: Fetch gross rewards from validators
    const grossRewards = parseFloat(await fetchValidatorRewards());
    if (grossRewards <= 0) {
      console.log('⚠️ No rewards to distribute today');
      return;
    }

    console.log(`📊 Gross rewards from validators: ${grossRewards} TON`);

    // Step 2: Calculate admin commission (12% hidden from users)
    const adminCommission = grossRewards * ADMIN_COMMISSION_RATE;
    const netRewards = grossRewards - adminCommission;
    
    console.log(`💰 Admin commission (12%): ${adminCommission.toFixed(9)} TON`);
    console.log(`💎 Net rewards for distribution: ${netRewards.toFixed(9)} TON`);

    // Step 3: Get all staking users from Firebase
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const stakingUsers: Array<{
      id: string;
      telegramId: string;
      username: string;
      stakedAmount: number;
      totalEarned: string;
      referredBy?: string;
      [key: string]: any;
    }> = [];
    let totalPoolStaked = 0;

    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const userStaked = parseFloat(userData.totalStaked || '0');
      if (userStaked > 0) {
        stakingUsers.push({
          id: doc.id,
          telegramId: userData.telegramId || '',
          username: userData.username || '',
          totalEarned: userData.totalEarned || '0',
          referredBy: userData.referredBy,
          stakedAmount: userStaked,
          ...userData
        });
        totalPoolStaked += userStaked;
      }
    });

    if (totalPoolStaked === 0) {
      console.log('⚠️ No staked users found, rewards go to admin wallet');
      return;
    }

    console.log(`👥 Distributing to ${stakingUsers.length} pool members`);
    console.log(`🏊 Total pool staked: ${totalPoolStaked.toFixed(9)} TON`);

    // Step 4: Distribute rewards proportionally with auto-compounding
    const rewardPromises = stakingUsers.map(async (user) => {
      const userShare = user.stakedAmount / totalPoolStaked;
      const userReward = netRewards * userShare;
      
      // Auto-compound rewards (add to staked amount)
      const newTotalStaked = (user.stakedAmount + userReward).toFixed(9);
      const newTotalEarned = (parseFloat(user.totalEarned || '0') + userReward).toFixed(9);

      // Update user in Firebase
      await updateDoc(doc(db, 'users', user.id), {
        totalStaked: newTotalStaked,
        totalEarned: newTotalEarned
      });

      // Create analytics record
      await storage.createAnalytics({
        telegramId: user.telegramId,
        date: new Date().toISOString().split('T')[0],
        netRewards: userReward.toFixed(9),
        grossRewards: (userReward / (1 - ADMIN_COMMISSION_RATE)).toFixed(9),
        netApy: '8.7',
        totalPoolBalance: totalPoolStaked.toFixed(9)
      });

      // Create transaction record
      await storage.createTransaction({
        telegramId: user.telegramId,
        type: 'reward',
        amount: userReward.toFixed(9),
        description: `Daily pool reward • Auto-compounded`,
        status: 'completed'
      });

      console.log(`✅ ${user.username}: +${userReward.toFixed(9)} TON (${(userShare * 100).toFixed(2)}%)`);
      
      // Send daily rewards notification
      const hasReferralBonus = Boolean(user.referredBy && userReward > 0);
      await sendDailyRewardsNotification(
        user.telegramId,
        user.username || 'Pool Member',
        userReward.toFixed(9),
        newTotalStaked,
        newTotalEarned,
        hasReferralBonus
      );

      // Process referral bonus if user has referrer
      if (user.referredBy && userReward > 0) {
        const referralBonus = userReward * REFERRAL_BONUS_RATE;
        
        try {
          const referrer = await storage.getUserByTelegramId(user.referredBy);
          if (referrer) {
            // Add bonus to referrer's app balance
            const newReferrerBalance = (parseFloat(referrer.appBalance || '0') + referralBonus).toFixed(9);
            await storage.updateUser(user.referredBy, { appBalance: newReferrerBalance });

            // Create referral record
            await storage.createReferral({
              referrer: user.referredBy,
              referred: user.telegramId,
              depositAmount: userReward.toFixed(9),
              bonus: referralBonus.toFixed(9)
            });

            // Create transaction for referrer
            await storage.createTransaction({
              telegramId: user.referredBy,
              type: 'referral_bonus',
              amount: referralBonus.toFixed(9),
              description: `Daily referral bonus from ${user.username}`,
              status: 'completed'
            });

            console.log(`💸 Referral bonus: ${referralBonus.toFixed(9)} TON to ${referrer.username}`);
            
            // Send Telegram notification for referral bonus
            const referrerEarnings = await storage.getReferralsByReferrer(user.referredBy);
            const totalReferralEarned = referrerEarnings.reduce((sum, ref) => sum + parseFloat(ref.bonus), 0).toFixed(9);
            
            await sendReferralBonusNotification(
              user.referredBy,
              referrer.username || 'Unknown',
              user.username || 'Unknown',
              referralBonus.toFixed(9),
              totalReferralEarned
            );
          }
        } catch (error) {
          console.error('❌ Failed to process referral bonus:', error);
        }
      }
    });

    // Execute all updates in parallel
    await Promise.all(rewardPromises);

    // Step 5: Update pool config with last payout
    await setDoc(doc(db, 'pool', 'config'), {
      totalStaked: totalPoolStaked.toFixed(9),
      totalRewards: (parseFloat(await storage.getTotalPoolSize())).toFixed(9),
      lastPayout: Timestamp.now(),
      adminWallet: getAdminWalletAddress(),
      lastGrossRewards: grossRewards.toFixed(9),
      lastAdminCommission: adminCommission.toFixed(9),
      commission: ADMIN_COMMISSION_RATE,
      referralBonus: REFERRAL_BONUS_RATE,
      automation: {
        stakingEnabled: true,
        rewardsEnabled: true,
        withdrawalsEnabled: true,
        referralSystemEnabled: true
      }
    }, { merge: true });

    // Step 6: Log admin commission transaction
    await storage.createTransaction({
      telegramId: 'admin',
      type: 'reward',
      amount: adminCommission.toFixed(9),
      description: `Admin commission (12%) from daily rewards`,
      status: 'completed'
    });

    console.log('🎉 Automated daily reward distribution completed!');
    console.log(`📈 Total distributed: ${netRewards.toFixed(9)} TON to users`);
    console.log(`💰 Admin commission: ${adminCommission.toFixed(9)} TON`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Automated reward distribution failed:', error);
    
    // Create error log in Firebase for monitoring
    try {
      await storage.createTransaction({
        telegramId: 'system',
        type: 'reward',
        amount: '0',
        description: `Reward distribution failed: ${errorMessage}`,
        status: 'failed'
      });
    } catch (logError) {
      console.error('❌ Failed to log error:', logError);
    }
  }
}

// Start automated daily reward scheduler
export function startRewardScheduler() {
  console.log('🔄 Starting automated cron-based reward scheduler...');
  
  // Run every day at midnight UTC
  const dailyJob = cron.schedule('0 0 * * *', async () => {
    console.log('⏰ Daily reward cron job triggered at midnight UTC');
    await calculateAndDistributeRewards();
  });

  // Start the cron job
  dailyJob.start();
  console.log('✅ Daily reward cron job scheduled for midnight UTC');

  // For development: also allow manual trigger every 5 minutes for testing
  if (process.env.NODE_ENV === 'development') {
    console.log('🧪 Development test job available (disabled by default)');
    // Uncomment the following to enable test rewards every 5 minutes in development:
    /*
    const testJob = cron.schedule('* /5 * * * *', async () => {
      console.log('🧪 Development test reward calculation (every 5 minutes)');
      await calculateAndDistributeRewards();
    });
    testJob.start();
    */
  }

  // Calculate next execution time
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setUTCDate(now.getUTCDate() + 1);
  nextMidnight.setUTCHours(0, 0, 0, 0);
  
  console.log(`⏰ Next automated reward distribution: ${nextMidnight.toISOString()}`);
  
  return { dailyJob };
}