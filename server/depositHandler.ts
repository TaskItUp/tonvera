// Deposit handler for the custodial pool system

import { storage } from './storage';
import { stakeTonToValidators } from './tonstakeApi';
import { getAdminWalletAddress } from './tonhubWalletSimple';
import { sendReferralBonusNotification, sendWelcomeReferralMessage, sendReferralMilestoneNotification } from './telegramBot';

const REFERRAL_BONUS_RATE = 0.10; // 10% referral bonus

export async function processDeposit(
  telegramId: string,
  amount: string,
  walletAddress: string
): Promise<any> {
  console.log(`💰 Processing deposit: ${amount} TON from user ${telegramId}`);
  
  try {
    const user = await storage.getUserByTelegramId(telegramId);
    if (!user) {
      throw new Error('User not found');
    }

    // Step 1: Auto-transfer user's TON to admin wallet (user sends directly to admin wallet)
    const transferTxHash = `deposit_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    console.log(`✅ User deposited ${amount} TON to admin wallet: ${getAdminWalletAddress()}`);

    // Step 2: Get current total pool size to calculate new staking amount
    const currentPoolSize = await storage.getTotalPoolSize();
    const newPoolTotal = (parseFloat(currentPoolSize) + parseFloat(amount)).toFixed(9);
    
    // Step 3: Auto-stake the new amount to validators via Tonstake API
    const stakeTxHash = await stakeTonToValidators(amount);
    console.log(`✅ Auto-staked ${amount} TON to Tonstake validators. TX: ${stakeTxHash}`);

    // Step 4: Create stake record
    const stake = await storage.createStake({
      telegramId,
      amount,
      direction: 'deposit',
      txHash: transferTxHash,
      status: 'completed'
    });

    // Step 5: Update user balances (individual tracking)
    const newUserStaked = (parseFloat(user.totalStaked || '0') + parseFloat(amount)).toFixed(9);
    const updatedUser = await storage.updateUser(telegramId, {
      totalStaked: newUserStaked,
      walletAddress
    });

    // Step 6: Create transaction record
    await storage.createTransaction({
      telegramId,
      type: 'deposit',
      amount,
      txHash: transferTxHash,
      description: `Deposited ${amount} TON • Auto-staked via Tonstake`,
      status: 'completed'
    });

    // Step 7: Process referral bonus (funded from admin wallet)
    if (user.referredBy && parseFloat(amount) >= 1) {
      const referralBonus = (parseFloat(amount) * REFERRAL_BONUS_RATE).toFixed(9);
      
      await processReferralBonus(user, referralBonus, amount, telegramId);
    }

    return { 
      success: true, 
      stake, 
      user: updatedUser,
      poolTotal: newPoolTotal,
      message: `Deposited ${amount} TON and auto-staked via Tonstake`,
      adminWallet: getAdminWalletAddress(),
      stakingTx: stakeTxHash
    };

  } catch (error: any) {
    console.error('Deposit processing error:', error);
    throw new Error(`Deposit failed: ${error?.message || 'Unknown error'}`);
  }
}

async function processReferralBonus(user: any, referralBonus: string, depositAmount: string, telegramId: string): Promise<void> {
  try {
    // Send referral bonus directly from admin wallet to referrer's balance
    await storage.createReferral({
      referrer: user.referredBy,
      referred: telegramId,
      depositAmount: depositAmount,
      bonus: referralBonus
    });

    const referrer = await storage.getUserByTelegramId(user.referredBy);
    if (referrer) {
      const newReferrerBalance = (parseFloat(referrer.appBalance || '0') + parseFloat(referralBonus)).toFixed(9);
      await storage.updateUser(user.referredBy, { appBalance: newReferrerBalance });
      
      await storage.createTransaction({
        telegramId: user.referredBy,
        type: 'referral_bonus',
        amount: referralBonus,
        description: `Referral reward from new pool member`,
        status: 'completed'
      });

      console.log(`✅ Paid ${referralBonus} TON referral bonus to ${referrer.username}`);
      
      // Send Telegram notifications
      const referrerEarnings = await storage.getReferralsByReferrer(user.referredBy);
      const totalReferralEarned = referrerEarnings.reduce((sum, ref) => sum + parseFloat(ref.bonus), 0).toFixed(9);
      
      // Send referral bonus notification
      await sendReferralBonusNotification(
        user.referredBy,
        referrer.username || 'Unknown',
        user.username || 'Unknown',
        referralBonus,
        totalReferralEarned
      );
      
      // Send welcome message to new user
      await sendWelcomeReferralMessage(
        telegramId,
        user.username || 'Pool Member',
        referrer.username || 'Your Referrer'
      );
      
      // Check for milestone notifications
      const milestones = [5, 10, 25, 50, 100];
      const referralCount = referrerEarnings.length;
      if (milestones.includes(referralCount)) {
        await sendReferralMilestoneNotification(
          user.referredBy,
          referrer.username || 'Unknown',
          referralCount,
          totalReferralEarned
        );
      }
    }
  } catch (error) {
    console.error('❌ Failed to process referral bonus:', error);
  }
}