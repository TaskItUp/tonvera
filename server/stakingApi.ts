import express from 'express';
import { body, param, validationResult } from 'express-validator';
// Smart contract imports removed - using direct admin wallet system
import { 
  getUserData, 
  updateUserBalance, 
  processReferral, 
  getTransactionHistory, 
  getPoolData,
  calculateReferralEarnings,
  verifyPremiumPayment,
  createPremiumSubscription,
  updateUserPremiumStatus
} from './firestoreManager';
import { getAdminWallet } from './adminWallet';

const router = express.Router();

/**
 * Validation middleware
 */
const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

/**
 * POST /api/auth/telegram - Telegram authentication (compatibility)
 */
router.post('/auth/telegram',
  [
    body('telegramId').isString().notEmpty().withMessage('Telegram ID is required')
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { telegramId, firstName, lastName, username } = req.body;
      
      // Get or create user
      const userData = await getUserData(telegramId);
      
      res.json({
        success: true,
        user: {
          id: userData.id,
          telegramId: telegramId,
          firstName: firstName || '',
          lastName: lastName || '',
          username: username || '',
          walletAddress: userData.walletAddress,
          stakedAmount: userData.stakedAmount,
          rewardsBalance: userData.rewardsBalance,
          referralCode: userData.referralCode
        }
      });
    } catch (error) {
      console.error('❌ Telegram auth failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Authentication failed'
      });
    }
  }
);

/**
 * POST /api/wallet/connect - Wallet connection (compatibility)
 */
router.post('/wallet/connect',
  [
    body('telegramId').isString().notEmpty().withMessage('Telegram ID is required'),
    body('walletAddress').isString().notEmpty().withMessage('Wallet address is required')
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { telegramId, walletAddress } = req.body;
      
      // Update user wallet address
      await updateUserBalance(telegramId, { walletAddress });
      
      res.json({
        success: true,
        message: 'Wallet connected successfully'
      });
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Wallet connection failed'
      });
    }
  }
);

/**
 * POST /api/deposit - Stake TON tokens (compatibility)
 */
router.post('/deposit',
  [
    body('amount').isString().matches(/^\d+(\.\d+)?$/).withMessage('Valid amount is required'),
    body('walletAddress').optional().isString().withMessage('Wallet address must be string')
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { telegramId, amount, walletAddress } = req.body;
      const userId = telegramId;
      
      console.log(`🔄 Stake request: ${amount} TON from user ${userId}`);
      
      // Validate amount
      const amountFloat = parseFloat(amount);
      if (amountFloat <= 0 || amountFloat < 0.1) {
        return res.status(400).json({
          success: false,
          message: 'Minimum stake amount is 0.1 TON'
        });
      }

      // Ensure user exists in Firestore
      const userData = await getUserData(userId);
      
      // Process stake through direct wallet transfer (custodial system)
      const adminWallet = getAdminWallet();
      const txHash = await adminWallet.processDirectDeposit(userId, amount, walletAddress || 'user_wallet');
      
      // Get updated user data
      const updatedUserData = await getUserData(userId);
      
      res.json({
        success: true,
        message: `Successfully staked ${amount} TON`,
        txHash,
        userData: updatedUserData
      });
      
      console.log(`✅ Stake completed: ${amount} TON for user ${userId}. TX: ${txHash}`);
    } catch (error) {
      console.error('❌ Stake failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Stake failed'
      });
    }
  }
);

/**
 * POST /api/withdraw - Withdraw TON tokens
 */
router.post('/withdraw',
  [
    body('amount').isString().matches(/^\d+(\.\d+)?$/).withMessage('Valid amount is required'),
    body('walletAddress').optional().isString().withMessage('Wallet address must be string')
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { telegramId, amount, walletAddress } = req.body;
      const userId = telegramId;
      
      console.log(`🔄 Withdraw request: ${amount} TON for user ${userId}`);
      
      // Validate amount
      const amountFloat = parseFloat(amount);
      if (amountFloat <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Withdraw amount must be greater than 0'
        });
      }

      // Process withdrawal through direct admin wallet transfer
      const adminWallet = getAdminWallet();
      const txHash = await adminWallet.processDirectWithdrawal(userId, amount, walletAddress || 'user_wallet');
      
      // Get updated user data
      const updatedUserData = await getUserData(userId);
      
      res.json({
        success: true,
        message: `Successfully withdrew ${amount} TON to ${walletAddress || 'wallet'}`,
        txHash,
        userData: updatedUserData
      });
      
      console.log(`✅ Withdrawal completed: ${amount} TON for user ${userId}. TX: ${txHash}`);
    } catch (error) {
      console.error('❌ Withdrawal failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Withdrawal failed'
      });
    }
  }
);

/**
 * GET /api/user/:userId - Get user balance and data (compatibility)
 */
router.get('/user/:userId',
  [
    param('userId').isString().notEmpty().withMessage('User ID is required')
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { userId } = req.params;
      
      // Get user data
      const userData = await getUserData(userId);
      
      // Calculate referral earnings
      const referralEarnings = await calculateReferralEarnings(userId);
      
      // Get pool data for APY and stats
      const poolData = await getPoolData();
      
      res.json({
        success: true,
        user: {
          id: userData.id,
          walletAddress: userData.walletAddress,
          stakedAmount: userData.stakedAmount,
          rewardsBalance: userData.rewardsBalance,
          totalEarned: userData.totalEarnings,
          referralCode: userData.referralCode,
          totalBalance: (parseFloat(userData.stakedAmount) + parseFloat(userData.rewardsBalance)).toFixed(9),
          referralStats: {
            count: 0,
            totalEarned: referralEarnings.toFixed(9)
          }
        },
        poolData: {
          apy: '8.7',
          totalStaked: poolData.totalStaked,
          dailyRate: poolData.dailyRate
        }
      });
    } catch (error) {
      console.error('❌ Get balance failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get balance'
      });
    }
  }
);

/**
 * GET /api/transactions/:userId - Get transaction history
 */
router.get('/transactions/:userId',
  [
    param('userId').isString().notEmpty().withMessage('User ID is required')
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Get transaction history
      const transactions = await getTransactionHistory(userId, limit);
      
      res.json({
        success: true,
        transactions,
        count: transactions.length
      });
    } catch (error) {
      console.error('❌ Get transactions failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get transactions'
      });
    }
  }
);

/**
 * POST /api/referral - Process referral code
 */
router.post('/referral',
  [
    body('userId').isString().notEmpty().withMessage('User ID is required'),
    body('referralCode').isString().notEmpty().withMessage('Referral code is required')
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { userId, referralCode } = req.body;
      
      console.log(`🔄 Processing referral: ${referralCode} for user ${userId}`);
      
      // Process referral
      const success = await processReferral(userId, referralCode);
      
      if (success) {
        const userData = await getUserData(userId);
        res.json({
          success: true,
          message: 'Referral code applied successfully',
          userData
        });
        console.log(`✅ Referral processed: ${userId} referred by code ${referralCode}`);
      } else {
        res.status(400).json({
          success: false,
          message: 'Invalid referral code or already used'
        });
      }
    } catch (error) {
      console.error('❌ Referral processing failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Referral processing failed'
      });
    }
  }
);

/**
 * GET /api/stats - Get pool statistics (compatibility)
 */
router.get('/stats', async (req: express.Request, res: express.Response) => {
  try {
    // Get pool data from Firestore
    const poolData = await getPoolData();
    
    // All operations fully automated through admin wallet
    // Skip contract data - using direct admin wallet automation
    
    // Get admin wallet balance
    const adminWallet = getAdminWallet();
    const adminBalance = await adminWallet.getBalance();
    
    res.json({
      success: true,
      totalPoolSize: poolData.totalStaked,
      totalStakers: 0,
      apy: '8.7',
      dailyRate: poolData.dailyRate,
      adminBalance,
      lastRewardDistribution: poolData.lastRewardDistribution
    });
  } catch (error) {
    console.error('❌ Get pool data failed:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get pool data'
    });
  }
});

/**
 * POST /api/admin/distribute-rewards - Manual rewards distribution (admin only)
 */
router.post('/admin/distribute-rewards', async (req: express.Request, res: express.Response) => {
  try {
    // In production, add proper admin authentication here
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    console.log('🔄 Manual rewards distribution requested by admin');
    
    // Import rewards scheduler for automation
    const { distributeRewards } = await import('./rewardsScheduler.js');
    await distributeRewards();
    
    res.json({
      success: true,
      message: 'Rewards distributed successfully'
    });
    
    console.log('✅ Manual rewards distribution completed');
  } catch (error) {
    console.error('❌ Manual rewards distribution failed:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Rewards distribution failed'
    });
  }
});

/**
 * POST /api/premium/unlock - Request premium subscription unlock
 */
router.post('/premium/unlock',
  [
    body('telegramId').isString().notEmpty().withMessage('Telegram ID is required'),
    body('txHash').isString().notEmpty().withMessage('Transaction hash is required')
  ],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { telegramId, txHash } = req.body;
      
      console.log(`🔄 Premium unlock request: ${telegramId} with TX: ${txHash}`);
      
      // Create pending premium subscription
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month from now
      
      const subscription = await createPremiumSubscription({
        telegramId,
        txHash,
        amount: '2.0',
        status: 'pending',
        subscriptionType: 'monthly',
        expiresAt
      });
      
      // Verify payment automatically
      const isValid = await verifyPremiumPayment(txHash, '2.0');
      
      if (isValid) {
        // Update subscription status and user premium status
        await updateUserPremiumStatus(telegramId, true, expiresAt, '10.5');
        
        res.json({
          success: true,
          message: 'Premium subscription activated successfully! You now earn 10.5% APY instead of 8.7%',
          subscription,
          expiresAt
        });
        
        console.log(`✅ Premium activated for user ${telegramId}, expires: ${expiresAt}`);
      } else {
        res.status(400).json({
          success: false,
          message: 'Payment verification failed. Please check transaction hash and amount (2 TON required)'
        });
      }
    } catch (error) {
      console.error('❌ Premium unlock failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Premium unlock failed'
      });
    }
  }
);

/**
 * GET /api/premium/status/:telegramId - Check premium status
 */
router.get('/premium/status/:telegramId',
  [param('telegramId').isString().notEmpty().withMessage('Telegram ID is required')],
  validateRequest,
  async (req: express.Request, res: express.Response) => {
    try {
      const { telegramId } = req.params;
      
      const userData = await getUserData(telegramId);
      
      if (!userData) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      const now = new Date();
      const isExpired = userData.premiumExpiresAt && new Date(userData.premiumExpiresAt) < now;
      
      // Auto-expire if needed
      if (userData.isPremium && isExpired) {
        await updateUserPremiumStatus(telegramId, false, null, '8.7');
        userData.isPremium = false;
        userData.premiumRate = '8.7';
      }
      
      res.json({
        success: true,
        isPremium: userData.isPremium,
        premiumExpiresAt: userData.premiumExpiresAt,
        premiumRate: userData.premiumRate || (userData.isPremium ? '10.5' : '8.7'),
        standardRate: '8.7',
        premiumBenefit: '1.8% higher APY (10.5% vs 8.7%)',
        monthlyCost: '2 TON'
      });
    } catch (error) {
      console.error('❌ Premium status check failed:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Premium status check failed'
      });
    }
  }
);

/**
 * POST /api/admin/withdraw-commission - Admin commission withdrawal
 */
router.post('/admin/withdraw-commission', async (req: express.Request, res: express.Response) => {
  try {
    // In production, add proper admin authentication here
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    const { amount, walletAddress } = req.body;
    
    if (!amount || !walletAddress) {
      return res.status(400).json({
        success: false,
        message: 'Amount and wallet address are required'
      });
    }
    
    console.log(`🔄 Admin commission withdrawal: ${amount} TON to ${walletAddress}`);
    
    // Process admin commission withdrawal
    const adminWallet = getAdminWallet();
    const txHash = await adminWallet.sendTon(walletAddress, amount, 'Admin Commission Withdrawal');
    
    res.json({
      success: true,
      message: `Successfully withdrew ${amount} TON commission`,
      txHash
    });
    
    console.log(`✅ Admin commission withdrawal completed: ${amount} TON. TX: ${txHash}`);
  } catch (error) {
    console.error('❌ Admin commission withdrawal failed:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Commission withdrawal failed'
    });
  }
});

/**
 * GET /api/admin/stats - Get admin statistics
 */
router.get('/admin/stats', async (req: express.Request, res: express.Response) => {
  try {
    // In production, add proper admin authentication here
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    const { getAllUsers } = await import('./firestoreManager');
    const allUsers = await getAllUsers();
    const adminWallet = getAdminWallet();
    const adminBalance = await adminWallet.getBalance();
    const poolData = await getPoolData();
    
    const totalUsers = allUsers.length;
    const activeUsers = allUsers.filter(user => parseFloat(user.stakedAmount) > 0).length;
    const totalStaked = allUsers.reduce((sum, user) => sum + parseFloat(user.stakedAmount), 0);
    const totalRewards = allUsers.reduce((sum, user) => sum + parseFloat(user.totalEarnings), 0);
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalStaked: totalStaked.toFixed(9),
        totalRewards: totalRewards.toFixed(9),
        adminBalance,
        poolData
      }
    });
  } catch (error) {
    console.error('❌ Get admin stats failed:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get admin stats'
    });
  }
});

export default router;