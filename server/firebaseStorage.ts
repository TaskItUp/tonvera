import {
  type User,
  type InsertUser,
  type Stake,
  type InsertStake,
  type Analytics,
  type InsertAnalytics,
  type Referral,
  type InsertReferral,
  type Transaction,
  type InsertTransaction
} from "@shared/schema";
import { IStorage } from "./storage";
import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  addDoc,
  Timestamp
} from "firebase/firestore";
import { randomUUID } from "crypto";

export class FirebaseStorage implements IStorage {
  
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    try {
      const userDoc = await getDoc(doc(db, 'users', id));
      if (!userDoc.exists()) return undefined;
      
      const data = userDoc.data();
      return {
        ...data,
        id: userDoc.id,
        joinedAt: data.joinedAt?.toDate() || new Date()
      } as User;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    try {
      const q = query(collection(db, 'users'), where('telegramId', '==', telegramId), limit(1));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return undefined;
      
      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        joinedAt: data.joinedAt?.toDate() || new Date()
      } as User;
    } catch (error) {
      console.error('Error getting user by telegram ID:', error);
      return undefined;
    }
  }

  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    try {
      const q = query(collection(db, 'users'), where('referralCode', '==', referralCode), limit(1));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return undefined;
      
      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        joinedAt: data.joinedAt?.toDate() || new Date()
      } as User;
    } catch (error) {
      console.error('Error getting user by referral code:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const id = randomUUID();
      const userData = {
        ...insertUser,
        joinedAt: Timestamp.now(),
        appBalance: insertUser.appBalance || '0',
        totalStaked: insertUser.totalStaked || '0',
        totalEarned: insertUser.totalEarned || '0',
        isPremium: insertUser.isPremium || false,
        firstName: insertUser.firstName || null,
        lastName: insertUser.lastName || null,
        walletAddress: insertUser.walletAddress || null,
        referredBy: insertUser.referredBy || null
      };

      await setDoc(doc(db, 'users', id), userData);
      
      console.log(`✅ Created user in Firebase: ${insertUser.username} (${insertUser.telegramId})`);
      
      return {
        ...userData,
        id,
        joinedAt: userData.joinedAt.toDate()
      } as User;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async updateUser(telegramId: string, updates: Partial<User>): Promise<User | undefined> {
    try {
      const user = await this.getUserByTelegramId(telegramId);
      if (!user) return undefined;

      const { id, joinedAt, ...updateData } = updates;
      await updateDoc(doc(db, 'users', user.id), updateData);
      
      return { ...user, ...updates };
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  // Stake operations
  async createStake(insertStake: InsertStake): Promise<Stake> {
    try {
      const stakeData = {
        ...insertStake,
        createdAt: Timestamp.now(),
        status: insertStake.status || 'pending',
        txHash: insertStake.txHash || null
      };

      const docRef = await addDoc(collection(db, 'stakes'), stakeData);
      
      return {
        ...stakeData,
        id: docRef.id,
        createdAt: stakeData.createdAt.toDate()
      } as Stake;
    } catch (error) {
      console.error('Error creating stake:', error);
      throw new Error('Failed to create stake');
    }
  }

  async getStakesByTelegramId(telegramId: string): Promise<Stake[]> {
    try {
      const q = query(
        collection(db, 'stakes'),
        where('telegramId', '==', telegramId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Stake[];
    } catch (error) {
      console.error('Error getting stakes:', error);
      return [];
    }
  }

  async updateStake(id: string, updates: Partial<Stake>): Promise<Stake | undefined> {
    try {
      const { id: _, createdAt, ...updateData } = updates;
      await updateDoc(doc(db, 'stakes', id), updateData);
      
      const updatedDoc = await getDoc(doc(db, 'stakes', id));
      if (!updatedDoc.exists()) return undefined;
      
      const data = updatedDoc.data();
      return {
        ...data,
        id: updatedDoc.id,
        createdAt: data.createdAt?.toDate() || new Date()
      } as Stake;
    } catch (error) {
      console.error('Error updating stake:', error);
      return undefined;
    }
  }

  // Analytics operations
  async createAnalytics(insertAnalytics: InsertAnalytics): Promise<Analytics> {
    try {
      const docRef = await addDoc(collection(db, 'analytics'), insertAnalytics);
      
      return {
        ...insertAnalytics,
        id: docRef.id
      } as Analytics;
    } catch (error) {
      console.error('Error creating analytics:', error);
      throw new Error('Failed to create analytics');
    }
  }

  async getAnalyticsByTelegramId(telegramId: string): Promise<Analytics[]> {
    try {
      const q = query(
        collection(db, 'analytics'),
        where('telegramId', '==', telegramId),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Analytics[];
    } catch (error) {
      console.error('Error getting analytics:', error);
      return [];
    }
  }

  async getRecentAnalytics(telegramId: string, days: number): Promise<Analytics[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];

      const q = query(
        collection(db, 'analytics'),
        where('telegramId', '==', telegramId),
        where('date', '>=', cutoffStr),
        orderBy('date', 'asc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Analytics[];
    } catch (error) {
      console.error('Error getting recent analytics:', error);
      return [];
    }
  }

  // Referral operations
  async createReferral(insertReferral: InsertReferral): Promise<Referral> {
    try {
      const referralData = {
        ...insertReferral,
        date: Timestamp.now()
      };

      const docRef = await addDoc(collection(db, 'referrals'), referralData);
      
      return {
        ...referralData,
        id: docRef.id,
        date: referralData.date.toDate()
      } as Referral;
    } catch (error) {
      console.error('Error creating referral:', error);
      throw new Error('Failed to create referral');
    }
  }

  async getReferralsByReferrer(referrer: string): Promise<Referral[]> {
    try {
      const q = query(
        collection(db, 'referrals'),
        where('referrer', '==', referrer),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        date: doc.data().date?.toDate() || new Date()
      })) as Referral[];
    } catch (error) {
      console.error('Error getting referrals by referrer:', error);
      return [];
    }
  }

  async getReferralsByReferred(referred: string): Promise<Referral[]> {
    try {
      const q = query(
        collection(db, 'referrals'),
        where('referred', '==', referred),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        date: doc.data().date?.toDate() || new Date()
      })) as Referral[];
    } catch (error) {
      console.error('Error getting referrals by referred:', error);
      return [];
    }
  }

  // Transaction operations
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    try {
      const transactionData = {
        ...insertTransaction,
        createdAt: Timestamp.now(),
        status: insertTransaction.status || 'completed',
        txHash: insertTransaction.txHash || null,
        description: insertTransaction.description || null
      };

      const docRef = await addDoc(collection(db, 'transactions'), transactionData);
      
      return {
        ...transactionData,
        id: docRef.id,
        createdAt: transactionData.createdAt.toDate()
      } as Transaction;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new Error('Failed to create transaction');
    }
  }

  async getTransactionsByTelegramId(telegramId: string): Promise<Transaction[]> {
    try {
      const q = query(
        collection(db, 'transactions'),
        where('telegramId', '==', telegramId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Transaction[];
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  }

  // Stats operations
  async getTotalPoolSize(): Promise<string> {
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      
      let totalStaked = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        totalStaked += parseFloat(data.totalStaked || '0');
      });
      
      return totalStaked.toFixed(9);
    } catch (error) {
      console.error('Error getting total pool size:', error);
      return '0';
    }
  }

  async getTotalStakers(): Promise<number> {
    try {
      const q = query(collection(db, 'users'));
      const snapshot = await getDocs(q);
      
      let stakers = 0;
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (parseFloat(data.totalStaked || '0') > 0) {
          stakers++;
        }
      });
      
      return stakers;
    } catch (error) {
      console.error('Error getting total stakers:', error);
      return 0;
    }
  }
}