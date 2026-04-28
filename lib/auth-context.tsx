'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  type User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        console.log('[Auth] Syncing session...');
        try {
          const idToken = await u.getIdToken();
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          });
          
          if (res.ok) {
            console.log('[Auth] Session synced successfully');
          } else {
            console.error('[Auth] Session sync failed:', await res.text());
          }
        } catch (err) {
          console.error('[Auth] Error during session sync:', err);
        }
      } else {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch (err) {
          console.error('[Auth] Logout sync failed:', err);
        }
      }
      
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Sign-in failed:', err);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      // The onAuthStateChanged listener will handle the /api/auth/logout call
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
