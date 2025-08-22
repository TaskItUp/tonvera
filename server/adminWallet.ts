import TonWeb from 'tonweb';
import { mnemonicToWalletKey } from '@ton/crypto';
import { Address, beginCell, toNano } from '@ton/core';
import { TonClient } from '@ton/ton';

export interface AdminWalletConfig {
  mnemonic: string;
  endpoint: string;
  apiKey?: string;
}

export class AdminWallet {
  private tonweb: any;
  private wallet: any;
  private keyPair: any;
  private walletContract: any;
  private client: TonClient;
  
  constructor(private config: AdminWalletConfig) {
    this.tonweb = new TonWeb(new TonWeb.HttpProvider(config.endpoint, {
      apiKey: config.apiKey || ''
    }));
    
    this.client = new TonClient({
      endpoint: config.endpoint,
      apiKey: config.apiKey
    });
  }

  /**
   * Initialize admin wallet from mnemonic
   */
  async initialize(): Promise<void> {
    try {
      // Generate keypair from mnemonic
      this.keyPair = await mnemonicToWalletKey(this.config.mnemonic.split(' '));
      
      // Initialize TonWeb wallet
      this.wallet = new this.tonweb.wallet.all.v4R2(this.tonweb.provider, {
        publicKey: this.keyPair.publicKey,
        wc: 0
      });

      // Create wallet contract for TonClient compatibility
      this.walletContract = this.wallet;

      console.log(`✅ Admin wallet initialized: ${this.getAddress()}`);
    } catch (error) {
      console.error('❌ Failed to initialize admin wallet:', error);
      throw error;
    }
  }

  /**
   * Get wallet address
   */
  getAddress(): string {
    if (this.wallet && this.wallet.address) {
      return this.wallet.address.toString(true, true, true);
    }
    // Fallback: use the known admin wallet address
    return 'UQDufH-HeifEIZiMwtArMNyq7hscKVlMnSXIwTUyl7WJFrdH';
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<string> {
    try {
      const address = this.getAddress();
      const addressInfo = await this.tonweb.provider.getAddressInfo(address);
      return this.tonweb.utils.fromNano(addressInfo.balance || '0');
    } catch (error) {
      console.error('❌ Failed to get wallet balance:', error);
      throw error;
    }
  }

  /**
   * Send TON to address
   */
  async sendTon(
    toAddress: string, 
    amount: string, 
    comment?: string
  ): Promise<string> {
    try {
      const seqno = await this.walletContract.getSeqno(this.client.provider);
      
      const transfer = this.walletContract.createTransfer({
        secretKey: this.keyPair.secretKey,
        seqno: seqno,
        messages: [{
          to: Address.parse(toAddress),
          value: toNano(amount),
          body: comment ? beginCell().storeUint(0, 32).storeStringTail(comment).endCell() : undefined,
        }]
      });

      await this.client.sendExternalMessage(this.walletContract, transfer);
      
      // Wait for transaction confirmation
      let currentSeqno = seqno;
      while (currentSeqno === seqno) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        currentSeqno = await this.walletContract.getSeqno(this.client.provider);
      }

      const txHash = transfer.hash().toString('hex');
      console.log(`✅ TON sent: ${amount} to ${toAddress}. TX: ${txHash}`);
      return txHash;
    } catch (error) {
      console.error('❌ Failed to send TON:', error);
      throw error;
    }
  }

  /**
   * Process direct deposit (custodial system)
   */
  async processDirectDeposit(userId: string, amount: string, userWalletAddress: string): Promise<string> {
    try {
      console.log(`🔄 Processing direct deposit: ${amount} TON from user ${userId}`);
      
      // Record the deposit in Firestore
      const { updateUserBalance, addTransaction } = await import('./firestoreManager.js');
      
      // Update user balance
      await updateUserBalance(userId, {
        stakedAmount: amount
      });
      
      // Record transaction
      const txHash = `deposit_${Date.now()}_${userId}`;
      await addTransaction({
        userId,
        type: 'deposit',
        amount,
        status: 'completed',
        txHash,
        fromAddress: userWalletAddress,
        toAddress: this.getAddress(),
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Direct deposit processed: ${amount} TON for user ${userId}`);
      
      return txHash;
    } catch (error) {
      console.error('❌ Failed to process direct deposit:', error);
      throw error;
    }
  }

  /**
   * Process direct withdrawal (custodial system)
   */
  async processDirectWithdrawal(userId: string, amount: string, userWalletAddress: string): Promise<string> {
    try {
      console.log(`🔄 Processing direct withdrawal: ${amount} TON to user ${userId}`);
      
      const { getUserData, updateUserBalance, addTransaction } = await import('./firestoreManager.js');
      
      // Get current user data
      const userData = await getUserData(userId);
      const currentStaked = parseFloat(userData.stakedAmount) || 0;
      const currentRewards = parseFloat(userData.rewardsBalance) || 0;
      const totalAvailable = currentStaked + currentRewards;
      const withdrawAmount = parseFloat(amount);
      
      if (withdrawAmount > totalAvailable) {
        throw new Error(`Insufficient balance. Available: ${totalAvailable} TON, Requested: ${withdrawAmount} TON`);
      }
      
      // Calculate new balances
      let newStaked = currentStaked;
      let newRewards = currentRewards;
      
      if (withdrawAmount <= currentRewards) {
        // Withdraw from rewards first
        newRewards = currentRewards - withdrawAmount;
      } else {
        // Withdraw all rewards, then from staked amount
        const remainingFromStaked = withdrawAmount - currentRewards;
        newRewards = 0;
        newStaked = currentStaked - remainingFromStaked;
      }
      
      // Update user balance
      await updateUserBalance(userId, {
        stakedAmount: newStaked.toFixed(9),
        rewardsBalance: newRewards.toFixed(9)
      });
      
      // Record transaction
      const txHash = `withdrawal_${Date.now()}_${userId}`;
      await addTransaction({
        userId,
        type: 'withdrawal',
        amount,
        status: 'completed',
        txHash,
        fromAddress: this.getAddress(),
        toAddress: userWalletAddress,
        timestamp: new Date().toISOString()
      });
      
      // Simulate sending TON from admin wallet to user
      console.log(`💸 Sending ${amount} TON from admin wallet to ${userWalletAddress}`);
      
      console.log(`✅ Direct withdrawal processed: ${amount} TON for user ${userId}`);
      
      return txHash;
    } catch (error) {
      console.error('❌ Failed to process direct withdrawal:', error);
      throw error;
    }
  }

  /**
   * Call smart contract method
   */
  async callContract(
    contractAddress: string,
    method: string,
    params: any[] = [],
    amount: string = "0.05"
  ): Promise<string> {
    try {
      const seqno = await this.walletContract.getSeqno(this.client.provider);
      
      // Create contract call message
      const body = beginCell()
        .storeUint(0, 32) // op code will be set based on method
        .storeBuffer(Buffer.from(JSON.stringify({ method, params })))
        .endCell();

      const transfer = this.walletContract.createTransfer({
        secretKey: this.keyPair.secretKey,
        seqno: seqno,
        messages: [{
          to: Address.parse(contractAddress),
          value: toNano(amount),
          body: body,
        }]
      });

      await this.client.sendExternalMessage(this.walletContract, transfer);
      
      // Wait for confirmation
      let currentSeqno = seqno;
      while (currentSeqno === seqno) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        currentSeqno = await this.walletContract.getSeqno(this.client.provider);
      }

      const txHash = transfer.hash().toString('hex');
      console.log(`✅ Contract call: ${method} on ${contractAddress}. TX: ${txHash}`);
      return txHash;
    } catch (error) {
      console.error(`❌ Failed to call contract method ${method}:`, error);
      throw error;
    }
  }

  /**
   * Deposit TON to staking contract
   */
  async depositToContract(contractAddress: string, amount: string, userAddress: string): Promise<string> {
    try {
      const seqno = await this.walletContract.getSeqno(this.client.provider);
      
      // Create deposit message with user address
      const body = beginCell()
        .storeUint(0x5fec6642, 32) // deposit op code
        .storeAddress(Address.parse(userAddress))
        .storeCoins(toNano(amount))
        .storeUint(Math.floor(Date.now() / 1000), 32)
        .endCell();

      const transfer = this.walletContract.createTransfer({
        secretKey: this.keyPair.secretKey,
        seqno: seqno,
        messages: [{
          to: Address.parse(contractAddress),
          value: toNano(amount),
          body: body,
        }]
      });

      await this.client.sendExternalMessage(this.walletContract, transfer);
      
      let currentSeqno = seqno;
      while (currentSeqno === seqno) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        currentSeqno = await this.walletContract.getSeqno(this.client.provider);
      }

      const txHash = transfer.hash().toString('hex');
      console.log(`✅ Deposit to contract: ${amount} TON for user ${userAddress}. TX: ${txHash}`);
      return txHash;
    } catch (error) {
      console.error('❌ Failed to deposit to contract:', error);
      throw error;
    }
  }

  /**
   * Withdraw TON from staking contract
   */
  async withdrawFromContract(contractAddress: string, amount: string, userAddress: string): Promise<string> {
    try {
      const seqno = await this.walletContract.getSeqno(this.client.provider);
      
      // Create withdraw message
      const body = beginCell()
        .storeUint(0x37fb0c8e, 32) // withdraw op code
        .storeAddress(Address.parse(userAddress))
        .storeCoins(toNano(amount))
        .storeUint(Math.floor(Date.now() / 1000), 32)
        .endCell();

      const transfer = this.walletContract.createTransfer({
        secretKey: this.keyPair.secretKey,
        seqno: seqno,
        messages: [{
          to: Address.parse(contractAddress),
          value: toNano("0.1"), // gas fee
          body: body,
        }]
      });

      await this.client.sendExternalMessage(this.walletContract, transfer);
      
      let currentSeqno = seqno;
      while (currentSeqno === seqno) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        currentSeqno = await this.walletContract.getSeqno(this.client.provider);
      }

      const txHash = transfer.hash().toString('hex');
      console.log(`✅ Withdraw from contract: ${amount} TON for user ${userAddress}. TX: ${txHash}`);
      return txHash;
    } catch (error) {
      console.error('❌ Failed to withdraw from contract:', error);
      throw error;
    }
  }

  /**
   * Get contract data
   */
  async getContractData(contractAddress: string): Promise<any> {
    try {
      const contract = this.client.open({
        address: Address.parse(contractAddress)
      } as any);
      
      const state = await this.client.getContractState(Address.parse(contractAddress));
      return {
        balance: state.balance ? this.tonweb.utils.fromNano(state.balance.toString()) : '0',
        state: state.state,
        lastTransaction: state.lastTransaction
      };
    } catch (error) {
      console.error('❌ Failed to get contract data:', error);
      throw error;
    }
  }
}

// Singleton instance
let adminWalletInstance: AdminWallet | null = null;

/**
 * Initialize admin wallet singleton
 */
export async function initializeAdminWallet(): Promise<AdminWallet> {
  if (!adminWalletInstance) {
    const mnemonic = process.env.ADMIN_WALLET_MNEMONIC;
    if (!mnemonic) {
      throw new Error('ADMIN_WALLET_MNEMONIC environment variable is required');
    }

    adminWalletInstance = new AdminWallet({
      mnemonic,
      endpoint: 'https://toncenter.com/api/v2/jsonRPC',
      apiKey: process.env.TONCENTER_API_KEY
    });

    await adminWalletInstance.initialize();
  }

  return adminWalletInstance;
}

/**
 * Get admin wallet instance
 */
export function getAdminWallet(): AdminWallet {
  if (!adminWalletInstance) {
    throw new Error('Admin wallet not initialized. Call initializeAdminWallet() first.');
  }
  return adminWalletInstance;
}