import * as cron from 'node-cron';
// Smart contract imports removed - using direct admin wallet automation

export class RewardsScheduler {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Start daily rewards distribution scheduler
   * Runs every day at midnight UTC
   */
  startDailyRewards(): void {
    try {
      // Stop existing job if running
      if (this.cronJob) {
        this.cronJob.stop();
      }

      // Schedule for every day at 00:00 UTC
      this.cronJob = cron.schedule('0 0 * * *', async () => {
        console.log('🕛 Starting daily rewards distribution at midnight UTC...');
        try {
          // All rewards distribution is fully automated through admin wallet
          const { distributeRewards } = await import('./firestoreManager.js');
          await distributeRewards();
          console.log('✅ Daily rewards distribution completed successfully');
        } catch (error) {
          console.error('❌ Daily rewards distribution failed:', error);
          // In production, you might want to send alerts or retry
        }
      });

      console.log('✅ Daily rewards scheduler started (runs at midnight UTC)');
    } catch (error) {
      console.error('❌ Failed to start rewards scheduler:', error);
      throw error;
    }
  }

  /**
   * Start rewards distribution for development/testing
   * Runs every 5 minutes for testing purposes
   */
  startTestingRewards(): void {
    try {
      if (this.cronJob) {
        this.cronJob.stop();
      }

      // For testing: run every 5 minutes
      this.cronJob = cron.schedule('*/5 * * * *', async () => {
        console.log('🧪 Running test rewards distribution...');
        try {
          // All rewards distribution is fully automated through admin wallet
          const { distributeRewards } = await import('./firestoreManager.js');
          await distributeRewards();
          console.log('✅ Test rewards distribution completed');
        } catch (error) {
          console.error('❌ Test rewards distribution failed:', error);
        }
      });

      console.log('🧪 Test rewards scheduler started (runs every 5 minutes)');
    } catch (error) {
      console.error('❌ Failed to start test rewards scheduler:', error);
      throw error;
    }
  }

  /**
   * Run rewards distribution manually
   */
  async runRewardsNow(): Promise<void> {
    try {
      console.log('🔄 Running manual rewards distribution...');
      // Manual rewards distribution through automated admin wallet
      const { distributeRewards } = await import('./firestoreManager.js');
      await distributeRewards();
      console.log('✅ Manual rewards distribution completed');
    } catch (error) {
      console.error('❌ Manual rewards distribution failed:', error);
      throw error;
    }
  }

  /**
   * Stop the rewards scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('⏹️ Rewards scheduler stopped');
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { running: boolean; nextRun?: Date } {
    if (!this.cronJob) {
      return { running: false };
    }

    return {
      running: this.cronJob.getStatus() === 'scheduled',
      nextRun: this.cronJob.nextDate()?.toDate()
    };
  }
}

// Singleton instance
let rewardsSchedulerInstance: RewardsScheduler | null = null;

/**
 * Get rewards scheduler instance
 */
export function getRewardsScheduler(): RewardsScheduler {
  if (!rewardsSchedulerInstance) {
    rewardsSchedulerInstance = new RewardsScheduler();
  }
  return rewardsSchedulerInstance;
}

/**
 * Initialize and start rewards scheduler
 */
export function initializeRewardsScheduler(): void {
  const scheduler = getRewardsScheduler();
  
  // Use testing scheduler in development, production scheduler in production
  if (process.env.NODE_ENV === 'development') {
    console.log('🧪 Starting testing rewards scheduler for development...');
    // Comment out the next line in production
    // scheduler.startTestingRewards();
  } else {
    console.log('🚀 Starting production rewards scheduler...');
    scheduler.startDailyRewards();
  }
}

/**
 * Setup additional scheduled tasks
 */
export function setupAdditionalSchedulers(): void {
  // Weekly pool statistics update
  cron.schedule('0 0 * * 0', async () => {
    console.log('📊 Running weekly pool statistics update...');
    try {
      const { getPoolData, updateFirestorePool } = await import('./firestoreManager');
      const poolData = await getPoolData();
      
      // Update weekly statistics
      await updateFirestorePool(poolData);
      
      console.log('✅ Weekly pool statistics updated');
    } catch (error) {
      console.error('❌ Weekly pool statistics update failed:', error);
    }
  });

  // Daily health check
  cron.schedule('0 12 * * *', async () => {
    console.log('🏥 Running daily health check...');
    try {
      const { getAdminWallet } = await import('./adminWallet');
      const adminWallet = getAdminWallet();
      const balance = await adminWallet.getBalance();
      
      console.log(`💰 Admin wallet balance: ${balance} TON`);
      
      // Alert if balance is low
      if (parseFloat(balance) < 10) {
        console.warn('⚠️ Admin wallet balance is low!');
        // In production, send alert to admins
      }
      
      console.log('✅ Daily health check completed');
    } catch (error) {
      console.error('❌ Daily health check failed:', error);
    }
  });

  console.log('✅ Additional schedulers initialized');
}