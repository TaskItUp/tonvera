// Re-export shared types
export type {
  User,
  InsertUser,
  Stake,
  InsertStake,
  Analytics,
  InsertAnalytics,
  Referral,
  InsertReferral,
  Transaction,
  InsertTransaction
} from "@shared/schema";

// Import for local usage
import type {
  User,
  Analytics,
  Transaction,
  Referral
} from "@shared/schema";

// Telegram WebApp types
export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  allows_write_to_pm?: boolean;
}

// Authentication types
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (telegramData: any) => Promise<void>;
  logout: () => void;
}

// Wallet types
export interface WalletContextType {
  isConnected: boolean;
  walletAddress: string | null;
  balance: string;
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

// Theme types
export interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface UserStatsResponse {
  user: User;
  recentAnalytics: Analytics[];
  transactions: Transaction[];
  referralStats: {
    count: number;
    totalEarned: string;
  };
}

export interface PoolStatsResponse {
  totalPoolSize: string;
  totalStakers: number;
  validatorUptime: string;
  netApy: string;
  grossApy: string;
  serviceFeePercent: string;
}

// Staking types
export interface StakingPosition {
  totalStaked: string;
  totalEarned: string;
  dailyRewards: string;
  netApy: string;
  nextRewardTime: string;
}

export interface DepositRequest {
  telegramId: string;
  amount: string;
  walletAddress: string;
}

export interface WithdrawRequest {
  telegramId: string;
  amount: string;
  walletAddress: string;
}

// Transaction types
export type TransactionType = 'deposit' | 'withdraw' | 'reward' | 'referral_bonus';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

// Chart data types
export interface ChartDataPoint {
  date: string;
  value: number;
  label: string;
}

export interface RewardsChartData {
  labels: string[];
  data: number[];
  totalEarned: string;
  avgDaily: string;
  compounded: string;
}

// Modal types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface DepositModalProps extends ModalProps {
  currentStaked: number;
}

export interface WithdrawModalProps extends ModalProps {
  availableAmount: number;
}

// Form types
export interface DepositFormData {
  amount: string;
}

export interface WithdrawFormData {
  amount: string;
}

// Boost types
export interface GamefiedBoost {
  id: string;
  type: 'early_staker' | 'premium' | 'referral_streak' | 'login_streak';
  title: string;
  description: string;
  icon: string;
  value: string;
  isActive: boolean;
  expiresAt?: Date;
}

// Referral types
export interface ReferralStats {
  totalReferrals: number;
  totalEarned: string;
  recentReferrals: Referral[];
}

// Settings types
export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  autoCompound: boolean;
  language: string;
}

// Loading state types
export interface LoadingState {
  isLoading: boolean;
  message?: string;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
}

// Component prop types
export interface ComponentWithChildren {
  children: React.ReactNode;
}

export interface ComponentWithClassName {
  className?: string;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

export type Required<T, K extends keyof T> = T & {
  [P in K]-?: T[P];
};

// Event types
export interface CustomEvent<T = any> {
  type: string;
  data: T;
}

// Navigation types
export type TabType = 'dashboard' | 'activity' | 'referrals';

// Validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Storage types
export interface StorageItem<T = any> {
  key: string;
  value: T;
  expiry?: number;
}

// Network types
export interface NetworkConfig {
  name: string;
  chainId: string;
  rpcUrl: string;
  explorerUrl: string;
  currency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

// Feature flags
export interface FeatureFlags {
  enablePremiumFeatures: boolean;
  enableReferralSystem: boolean;
  enableNotifications: boolean;
  enableBiometrics: boolean;
  enableCloudStorage: boolean;
}
