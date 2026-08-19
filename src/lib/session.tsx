import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { bootstrap, logout as apiLogout } from "./api";
import type { TokenPayload } from "./auth";

interface SessionCtx {
  ready: boolean;
  installed: boolean;
  session: TokenPayload | null;
  refresh: () => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<SessionCtx>({ ready: false, installed: false, session: null, refresh: async () => undefined, logout: () => undefined });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [session, setSession] = useState<TokenPayload | null>(null);

  const refresh = async () => {
    const b = await bootstrap();
    setInstalled(b.installed);
    setSession(b.session);
    setReady(true);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const logout = () => {
    apiLogout();
    setSession(null);
  };

  return <Ctx.Provider value={{ ready, installed, session, refresh, logout }}>{children}</Ctx.Provider>;
}

export function useSession(): SessionCtx {
  return useContext(Ctx);
}
