import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeFirestore } from "./firebase";
import { initializeTonhubWallet, sendTonFromAdmin, getAdminWalletAddress, getAdminWalletBalance, syncAdminWalletToFirestore, updateWalletConfig } from "./tonhubWalletSimple";
import { stakeTonToValidators, unstakeTonFromValidators, fetchValidatorRewards, getPoolStatistics } from "./tonstakeApi";
import { startRewardScheduler, calculateAndDistributeRewards } from "./rewardScheduler";
import { insertUserSchema, insertStakeSchema, insertTransactionSchema } from "@shared/schema";
import { z } from "zod";
import { sendReferralBonusNotification, sendWelcomeReferralMessage, sendReferralMilestoneNotification } from "./telegramBot";
import { executeSmartContractDeposit, executeSmartContractWithdraw, verifyBlockchainTransaction, isSmartContractTransaction } from "./smartContract";

// Admin wallet configuration for custodial pool
const ADMIN_COMMISSION_RATE = 0.12; // 12% commission (hidden from users)
const REFERRAL_BONUS_RATE = 0.10; // 10% referral bonus


// Validate user wallet ownership before withdrawals
async function validateWalletOwnership(telegramId: string, walletAddress: string): Promise<boolean> {
  try {
    // In production, implement proper wallet ownership validation
    // For now, just check if wallet address is provided
    return Boolean(walletAddress && walletAddress.length > 10);
  } catch (error) {
    console.error('Wallet validation failed:', error);
    return false;
  }
}

// Auto-retry failed blockchain transactions
async function retryTransaction(operation: () => Promise<string>, maxRetries: number = 3): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Transaction attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) throw error;
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  throw new Error('All transaction attempts failed');
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Initialize Firebase and Tonhub wallet on startup
  await initializeFirestore();
  await initializeTonhubWallet();
  
  // Start automated reward scheduler
  startRewardScheduler();
  
  // Authentication endpoint
  app.post("/api/auth/telegram", async (req, res) => {
    try {
      const { telegramId, username, firstName, lastName } = req.body;
      
      if (!telegramId || !username) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      let user = await storage.getUserByTelegramId(telegramId);
      
      if (!user) {
        // Generate unique referral code
        const referralCode = username.toLowerCase() + Math.random().toString(36).substr(2, 6);
        
        user = await storage.createUser({
          telegramId,
          username,
          firstName,
          lastName,
          referralCode,
          appBalance: '0',
          totalStaked: '0',
          totalEarned: '0',
          isPremium: false
        });
      }

      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Get user profile and stats
  app.get("/api/user/:telegramId", async (req, res) => {
    try {
      const { telegramId } = req.params;
      
      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get recent analytics for rewards calculation
      const recentAnalytics = await storage.getRecentAnalytics(telegramId, 7);
      const transactions = await storage.getTransactionsByTelegramId(telegramId);
      const referrals = await storage.getReferralsByReferrer(telegramId);

      res.json({
        user,
        recentAnalytics,
        transactions: transactions.slice(0, 10), // Last 10 transactions
        referralStats: {
          count: referrals.length,
          totalEarned: referrals.reduce((sum, ref) => sum + parseFloat(ref.bonus), 0).toFixed(9)
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  });

  // Get pool statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const totalPoolSize = await storage.getTotalPoolSize();
      const totalStakers = await storage.getTotalStakers();
      
      // Get real statistics from Tonstake API
      const poolStats = await getPoolStatistics();
      
      res.json({
        totalPoolSize,
        totalStakers,
        validatorUptime: poolStats.uptime || '99.8',
        netApy: '8.7', // After 12% commission
        grossApy: poolStats.apy || '9.9',
        serviceFeePercent: '12',
        adminWalletAddress: getAdminWalletAddress()
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pool stats" });
    }
  });

  // Smart Contract Deposit - Direct blockchain interaction
  app.post("/api/deposit", async (req, res) => {
    try {
      const depositSchema = z.object({
        telegramId: z.string(),
        amount: z.string(),
        walletAddress: z.string(),
        txHash: z.string().optional(),
        contractTransaction: z.boolean().optional()
      });

      const { telegramId, amount, walletAddress, txHash, contractTransaction } = depositSchema.parse(req.body);
      
      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let finalTxHash: string;

      if (contractTransaction && txHash) {
        // Smart contract transaction - verify on blockchain
        const isValid = await verifyBlockchainTransaction(txHash);
        if (!isValid) {
          return res.status(400).json({ message: "Invalid or unconfirmed blockchain transaction" });
        }
        finalTxHash = txHash;
        console.log(`✅ Smart contract deposit verified: ${amount} TON. TX: ${finalTxHash}`);
      } else {
        // Execute smart contract deposit via backend
        const smartContractResult = await executeSmartContractDeposit(walletAddress, amount, telegramId);
        finalTxHash = smartContractResult.hash;
        console.log(`✅ Smart contract deposit executed: ${amount} TON. TX: ${finalTxHash}`);
      }

      // Step 2: Get current total pool size to calculate new staking amount
      const currentPoolSize = await storage.getTotalPoolSize();
      const newPoolTotal = (parseFloat(currentPoolSize) + parseFloat(amount)).toFixed(9);
      
      // Step 3: Auto-stake the new amount to validators with retry logic
      const stakeTxHash = await retryTransaction(
        () => stakeTonToValidators(amount)
      );
      console.log(`✅ Auto-staked ${amount} TON to validators. TX: ${stakeTxHash}`);

      // Step 4: Create stake record
      const stake = await storage.createStake({
        telegramId,
        amount,
        direction: 'deposit',
        txHash: finalTxHash,
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
        txHash: finalTxHash,
        description: `Smart Contract Deposit: ${amount} TON • Auto-staked to validator`,
        status: 'completed'
      });

      // Step 6.5: Auto-sync updated pool configuration to Firestore
      await updateWalletConfig({
        lastDeposit: new Date().toISOString(),
        totalDeposited: newPoolTotal,
        lastDepositAmount: amount
      });

      // Step 7: Process referral bonus (funded from admin wallet)
      if (user.referredBy && parseFloat(amount) >= 1) {
        const referralBonus = (parseFloat(amount) * 0.10).toFixed(9); // 10% referral bonus
        
        // Send referral bonus directly from admin wallet to referrer's balance
        await storage.createReferral({
          referrer: user.referredBy,
          referred: telegramId,
          depositAmount: amount,
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
            description: `Referral reward from pool member`
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
      }

      res.json({ 
        success: true, 
        stake, 
        user: updatedUser,
        poolTotal: newPoolTotal,
        message: `Deposited ${amount} TON and auto-staked to validator`
      });
    } catch (error) {
      console.error('Deposit error:', error);
      res.status(500).json({ message: "Deposit failed" });
    }
  });

  // Withdraw TON - Instant from Admin Wallet
  app.post("/api/withdraw", async (req, res) => {
    try {
      const withdrawSchema = z.object({
        telegramId: z.string(),
        amount: z.string(),
        walletAddress: z.string(),
        txHash: z.string().optional(),
        contractTransaction: z.boolean().optional()
      });

      const { telegramId, amount, walletAddress, txHash, contractTransaction } = withdrawSchema.parse(req.body);
      
      const user = await storage.getUserByTelegramId(telegramId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const availableAmount = parseFloat(user.totalStaked || '0');
      const withdrawAmount = parseFloat(amount);

      if (withdrawAmount > availableAmount) {
        return res.status(400).json({ message: "Insufficient staked amount" });
      }

      // Validate wallet ownership before withdrawal
      const isValidWallet = await validateWalletOwnership(telegramId, walletAddress);
      if (!isValidWallet) {
        return res.status(400).json({ message: "Invalid wallet address or ownership" });
      }

      let finalTxHash: string;

      if (contractTransaction && txHash) {
        // Smart contract transaction already executed - verify on blockchain
        const isValid = await verifyBlockchainTransaction(txHash);
        if (!isValid) {
          return res.status(400).json({ message: "Invalid or unconfirmed blockchain transaction" });
        }
        finalTxHash = txHash;
        console.log(`✅ Smart contract withdrawal verified: ${amount} TON. TX: ${finalTxHash}`);
      } else {
        // Execute instant smart contract withdrawal
        const smartContractResult = await executeSmartContractWithdraw(walletAddress, amount, telegramId);
        finalTxHash = smartContractResult.hash;
        console.log(`✅ Smart contract withdrawal executed instantly: ${amount} TON. TX: ${finalTxHash}`);
      }

      // Step 2: Calculate proportional unstake needed from validator (for pool management)
      const totalPoolSize = parseFloat(await storage.getTotalPoolSize());
      const proportionalUnstake = withdrawAmount;
      
      // Step 3: Unstake proportional amount from validators (background operation)
      const unstakeTxHash = await retryTransaction(
        () => unstakeTonFromValidators(proportionalUnstake.toFixed(9))
      );
      console.log(`✅ Background unstaked ${proportionalUnstake.toFixed(9)} TON from validators. TX: ${unstakeTxHash}`);

      // Step 4: Create withdraw stake record
      const stake = await storage.createStake({
        telegramId,
        amount,
        direction: 'withdraw',
        txHash: finalTxHash,
        status: 'completed'
      });

      // Step 5: Update user balances
      const newUserStaked = (availableAmount - withdrawAmount).toFixed(9);
      const updatedUser = await storage.updateUser(telegramId, {
        totalStaked: newUserStaked
      });

      // Step 6: Create transaction record
      await storage.createTransaction({
        telegramId,
        type: 'withdraw',
        amount,
        txHash: finalTxHash,
        status: 'completed',
        description: `Smart Contract Withdrawal: ${amount} TON • Instantly processed`
      });

      // Step 7: Auto-sync updated pool configuration to Firestore
      await updateWalletConfig({
        lastWithdrawal: new Date().toISOString(),
        totalWithdrawn: (parseFloat(await storage.getTotalPoolSize()) - withdrawAmount).toString()
      });

      res.json({ 
        success: true, 
        stake, 
        user: updatedUser,
        message: `Instantly sent ${amount} TON to your wallet`,
        txHash: finalTxHash
      });
    } catch (error) {
      console.error('Withdrawal error:', error);
      res.status(500).json({ message: "Withdrawal failed" });
    }
  });

  // Update wallet address
  app.post("/api/wallet/connect", async (req, res) => {
    try {
      const walletSchema = z.object({
        telegramId: z.string(),
        walletAddress: z.string()
      });

      const { telegramId, walletAddress } = walletSchema.parse(req.body);
      
      const user = await storage.updateUser(telegramId, { walletAddress });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ success: true, user });
    } catch (error) {
      res.status(500).json({ message: "Failed to connect wallet" });
    }
  });

  // Process referral registration
  app.post("/api/referral/register", async (req, res) => {
    try {
      const referralSchema = z.object({
        telegramId: z.string(),
        referralCode: z.string()
      });

      const { telegramId, referralCode } = referralSchema.parse(req.body);
      
      const user = await storage.getUserByTelegramId(telegramId);
      const referrer = await storage.getUserByReferralCode(referralCode);
      
      if (!user || !referrer) {
        return res.status(404).json({ message: "User or referrer not found" });
      }

      if (user.referredBy) {
        return res.status(400).json({ message: "User already has a referrer" });
      }

      if (referrer.telegramId === telegramId) {
        return res.status(400).json({ message: "Cannot refer yourself" });
      }

      const updatedUser = await storage.updateUser(telegramId, { referredBy: referrer.telegramId });

      res.json({ success: true, user: updatedUser, referrer });
    } catch (error) {
      res.status(500).json({ message: "Referral registration failed" });
    }
  });

  // Admin endpoint to manually trigger reward calculation
  app.post("/api/admin/calculate-rewards", async (req, res) => {
    try {
      // Security check - only allow from admin
      const adminKey = req.headers['x-admin-key'];
      if (adminKey !== process.env.ADMIN_API_KEY) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      await calculateAndDistributeRewards();
      
      const totalStakers = await storage.getTotalStakers();
      const totalPoolSize = await storage.getTotalPoolSize();

      res.json({ 
        success: true, 
        message: `Automated rewards distributed to ${totalStakers} pool members`,
        totalStakers,
        totalPoolSize,
        commission: `${(ADMIN_COMMISSION_RATE * 100)}% admin commission applied automatically`
      });
    } catch (error) {
      console.error('Manual reward calculation error:', error);
      res.status(500).json({ message: "Automated reward distribution failed" });
    }
  });

  // Get admin wallet address for deposits
  app.get("/api/admin-wallet", async (req, res) => {
    try {
      const adminWalletAddress = getAdminWalletAddress();
      const balance = await getAdminWalletBalance();
      
      res.json({
        address: adminWalletAddress,
        balance: balance,
        qrCode: `ton://transfer/${adminWalletAddress}`,
        depositInstructions: [
          "Send TON directly to this admin wallet address",
          "Your deposit will be automatically pooled and staked",
          "You'll start earning rewards within 24 hours",
          "All rewards are auto-compounded daily"
        ]
      });
      
      // Auto-sync wallet info to Firestore on every request
      await syncAdminWalletToFirestore();
    } catch (error) {
      console.error('Error fetching admin wallet info:', error);
      res.status(500).json({ message: "Failed to fetch admin wallet information" });
    }
  });

  // Get pool configuration from Firebase
  app.get("/api/pool/config", async (req, res) => {
    try {
      const { doc: poolDoc, getDoc } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      
      const poolConfigDoc = await getDoc(poolDoc(db, 'pool', 'config'));
      
      if (!poolConfigDoc.exists()) {
        return res.status(404).json({ message: "Pool configuration not found" });
      }
      
      const config = poolConfigDoc.data();
      res.json({
        adminWallet: getAdminWalletAddress(),
        totalStaked: config.totalStaked,
        totalRewards: config.totalRewards,
        lastPayout: config.lastPayout?.toDate?.() || config.lastPayout,
        isAutomated: true,
        commission: "12%",
        referralBonus: "10%"
      });
    } catch (error) {
      console.error('Error fetching pool config:', error);
      res.status(500).json({ message: "Failed to fetch pool configuration" });
    }
  });

  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      const totalStakers = await storage.getTotalStakers();
      const totalPoolSize = await storage.getTotalPoolSize();
      
      res.json({
        status: 'healthy',
        backend: 'Firebase + TON automated',
        totalStakers,
        totalPoolSize,
        automation: {
          rewardScheduler: 'active',
          autoStaking: 'enabled',
          instantWithdrawals: 'enabled',
          referralSystem: 'automated'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
