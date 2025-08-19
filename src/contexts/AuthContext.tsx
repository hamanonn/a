import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  totalPoints: number;
  totalReduction: number; // kg単位
  rank: string;
  createdAt: any; // FirestoreのTimestamp型を想定
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const getRankByPoints = (points: number): string => {
  if (points >= 10000) return 'エコヒーロー';
  if (points >= 5000) return 'エコマスター';
  if (points >= 2000) return 'エコチャレンジャー';
  if (points >= 500) return 'エコサポーター';
  return 'エコビギナー';
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchUserProfile = async (user: User) => {
    const userRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      setUserProfile(docSnap.data() as UserProfile);
    } else {
      // Firestoreにプロフィールがない場合（例：旧システムからの移行など）
      // ここでは新規作成時の処理に任せるため、nullのままにするか、
      // もしくは基本的なプロフィールを作成することも可能
      console.log("No such user profile!");
    }
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Firestoreにユーザープロフィールを保存
    const newUserProfile: UserProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName,
      totalPoints: 0,
      totalReduction: 0,
      rank: 'エコビギナー',
      createdAt: serverTimestamp(),
    };
    
    await setDoc(doc(db, 'users', user.uid), newUserProfile);
    setUserProfile(newUserProfile);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    
    const userRef = doc(db, 'users', currentUser.uid);
    const updatedData = { ...data };

    if (data.totalPoints !== undefined) {
      updatedData.rank = getRankByPoints(data.totalPoints);
    }

    await setDoc(userRef, updatedData, { merge: true });
    // stateを更新してUIに即時反映
    setUserProfile(prevProfile => prevProfile ? { ...prevProfile, ...updatedData } : null);
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    login,
    register,
    logout,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
