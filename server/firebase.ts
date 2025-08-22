import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, updateDoc, addDoc, Timestamp } from "firebase/firestore";
import { randomUUID } from "crypto";

const firebaseConfig = {
  apiKey: "AIzaSyCaeZOOzfZ0JW9yqpcCrXj6vDgf6o3tC6Q",
  authDomain: "tonvera-e8bbb.firebaseapp.com",
  projectId: "tonvera-e8bbb",
  storageBucket: "tonvera-e8bbb.firebasestorage.app",
  messagingSenderId: "97256787310",
  appId: "1:97256787310:web:86d2b6625e14967c7fc57f",
  measurementId: "G-Y9GNY5E5ED"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Auto-create collections and documents on first access
export async function ensureCollectionExists(collectionName: string) {
  try {
    // Try to get a document from the collection
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(query(collectionRef, limit(1)));
    
    if (snapshot.empty && collectionName === 'pool') {
      // Auto-create pool document if collection is empty
      await setDoc(doc(db, 'pool', 'config'), {
        totalStaked: '0',
        totalRewards: '0',
        lastPayout: Timestamp.now(),
        adminWallet: 'UQDufH-HeifEIZiMwtArMNyq7hscKVlMnSXIwTUyl7WJFrdH',
        createdAt: Timestamp.now()
      });
      console.log(`✅ Auto-created ${collectionName} collection with default config`);
    }
  } catch (error) {
    console.log(`ℹ️ Collection ${collectionName} will be created on first write`);
  }
}

// Initialize all required collections
export async function initializeFirestore() {
  console.log('🔄 Initializing Firestore collections...');
  await Promise.all([
    ensureCollectionExists('users'),
    ensureCollectionExists('transactions'), 
    ensureCollectionExists('pool')
  ]);
  console.log('✅ Firestore initialization complete');
}