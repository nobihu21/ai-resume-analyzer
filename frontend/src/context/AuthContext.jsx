import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log('[Auth] User state changed:', currentUser ? 'logged in' : 'logged out');
      
      setLoading(false); // UNBLOCK UI IMMEDIATELY
      
      if (currentUser) {
        setUser(currentUser);
        
        // ASYNC profile fetch - doesn't block loading
        (async () => {
          try {
            console.log('[Auth] Fetching profile...');
            const userDoc = await Promise.race([
              getDoc(doc(db, 'users', currentUser.uid)),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Profile timeout')), 5000)
              )
            ]);
            
            if (userDoc.exists()) {
              setUserProfile(userDoc.data());
            } else {
              const defaultProfile = {
                uid: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName || 'User',
                createdAt: new Date(),
                resumeScore: 0,
                jobsApplied: 0
              };
              setUserProfile(defaultProfile);
              console.log('[Auth] Created default profile');
            }
          } catch (err) {
            console.error('[Auth] Profile fetch failed:', err.message);
            // Fallback to basic profile
            setUserProfile({
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: 'User',
              createdAt: new Date()
            });
          }
        })();
      } else {
        setUser(null);
        setUserProfile(null);
      }
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (err) {
      console.error('Logout error:', err);
      setError(err.message);
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    error,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
