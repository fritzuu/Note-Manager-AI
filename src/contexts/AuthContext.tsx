"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserDocument, createUserDocument, type UserDocument } from "@/lib/firestore";

interface AuthContextValue {
  user: User | null;
  userDoc: UserDocument | null;
  loading: boolean;
  refreshUserDoc: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userDoc: null,
  loading: true,
  refreshUserDoc: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserDoc = useCallback(async () => {
    if (!user) return;
    try {
      const doc = await getUserDocument(user.uid);
      setUserDoc(doc);
    } catch (error) {
      console.error("Failed to refresh user document (offline?):", error);
    }
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          let doc = await getUserDocument(firebaseUser.uid);
          if (!doc) {
            // Auto-create the user profile in Firestore if it's missing (e.g. from failed earlier registrations)
            await createUserDocument(firebaseUser.uid, {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Student",
              email: firebaseUser.email || "",
              assessmentCompleted: false,
            });
            doc = await getUserDocument(firebaseUser.uid);
          }
          setUserDoc(doc);
        } catch (error) {
          console.error("Failed to fetch user document (offline?):", error);
          setUserDoc(null);
        }
      } else {
        setUserDoc(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userDoc, loading, refreshUserDoc }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
