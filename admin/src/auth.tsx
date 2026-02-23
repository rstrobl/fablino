import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  credentials: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentials] = useState<string | null>(() => {
    return sessionStorage.getItem('fablino_auth');
  });

  const login = useCallback(async (username: string, password: string) => {
    const cred = 'Basic ' + btoa(`${username}:${password}`);
    try {
      const res = await fetch('/api/admin/stories', {
        headers: { Authorization: cred },
      });
      if (res.ok) {
        sessionStorage.setItem('fablino_auth', cred);
        setCredentials(cred);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('fablino_auth');
    setCredentials(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!credentials, credentials, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
