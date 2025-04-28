import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);         // Firebase Auth user
  const [role, setRole] = useState(null);         // 'admin', 'manager', 'viewer'
  const [loading, setLoading] = useState(true);   // Still loading user/role

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
    if (authUser) {
      const userRef = doc(db, 'users', authUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        setUser({ ...authUser, ...data }); // 🛠 merge Firestore profile into user
        setRole(data.role || null);
      } else {
        setUser(authUser);
        setRole(null);
      }
    } else {
      setUser(null);
      setRole(null);
    }
    setLoading(false);
  });

  return () => unsubscribe();
}, []);

const refreshUserData = async () => {
  if (auth.currentUser) {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      setUser({ ...auth.currentUser, ...data });
      setRole(data.role || null);
    }
  }
};


  return (
<UserContext.Provider value={{ user, role, loading, refreshUserData }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
