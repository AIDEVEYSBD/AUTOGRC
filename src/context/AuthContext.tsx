'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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
  const [isAuthenticated] = useState(initialAuth);
  const [user] = useState<AppUser | null>(initialUser);

  // RP-initiated logout: a top-level navigation so the server can redirect the
  // browser through the AutoX ID end_session_endpoint (see /api/auth/logout).
  const logout = useCallback(async () => {
    window.location.href = '/api/auth/logout';
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
