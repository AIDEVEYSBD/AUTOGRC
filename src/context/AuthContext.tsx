'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export interface AppUser {
  id?: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  user: AppUser | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  user: null,
  logout: async () => {},
});

export function AuthProvider({
  children,
  initialAuth,
  initialUser = null,
}: {
  children: ReactNode;
  initialAuth: boolean;
  initialUser?: AppUser | null;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);
  const [user] = useState<AppUser | null>(initialUser);
  const router = useRouter();

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAuthenticated(false);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
