import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initializeAdminWallet } from './adminWallet';
import { initializeRewardsScheduler, setupAdditionalSchedulers } from './rewardsScheduler';
import stakingApi from './stakingApi';

export class StakingServer {
  private app: express.Application;
  private port: number;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS configuration
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: {
        success: false,
        message: 'Too many requests, please try again later'
      }
    });
    this.app.use('/api/', limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'TON Staking Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // API routes
    this.app.use('/api', stakingApi);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint not found'
      });
    });

    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('❌ Global error handler:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
      });
    });
  }

  /**
   * Initialize all components
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing TON Staking Server...');
      
      // Validate required environment variables (skip contract validation for auto-deployment)
      this.validateEnvironment();
      
      // Initialize admin wallet
      console.log('🔄 Initializing admin wallet...');
      await initializeAdminWallet();
      console.log('✅ Admin wallet initialized');
      
      // Skip smart contract initialization - using direct wallet transfers
      
      // Initialize rewards scheduler
      console.log('🔄 Setting up automated schedulers...');
      initializeRewardsScheduler();
      setupAdditionalSchedulers();
      console.log('✅ Automated schedulers initialized');
      
      console.log('✅ TON Staking Server initialization completed');
    } catch (error) {
      console.error('❌ Failed to initialize server:', error);
      throw error;
    }
  }


  /**
   * Validate required environment variables
   */
  private validateEnvironment(): void {
    const required = [
      'ADMIN_WALLET_MNEMONIC',
      'FIREBASE_SERVICE_ACCOUNT_KEY'
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    console.log('✅ Environment variables validated');
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      await this.initialize();
      
      this.app.listen(this.port, () => {
        console.log(`🚀 TON Staking Server running on port ${this.port}`);
        console.log(`📊 Health check: http://localhost:${this.port}/health`);
        console.log(`🔗 API endpoint: http://localhost:${this.port}/api`);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down TON Staking Server...');
    
    try {
      // Stop schedulers
      const { getRewardsScheduler } = await import('./rewardsScheduler');
      getRewardsScheduler().stop();
      
      console.log('✅ TON Staking Server shut down gracefully');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }

  /**
   * Get Express app instance
   */
  getApp(): express.Application {
    return this.app;
  }
}

export default StakingServer;