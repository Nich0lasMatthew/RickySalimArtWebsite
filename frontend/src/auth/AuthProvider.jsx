import { useCallback, useEffect, useMemo, useState } from "react";
import { onIdTokenChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { AuthContext } from "./context";

async function roleOf(user) {
  if (!user) return "visitor";
  const { claims } = await user.getIdTokenResult();
  return claims.admin === true ? "admin" : "customer";
}

export default function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, role: "visitor", loading: Boolean(auth) });

  useEffect(() => {
    if (!auth) return;
    // Fires on sign-in, sign-out and every token refresh (about hourly).
    return onIdTokenChanged(auth, async (user) => {
      const role = await roleOf(user).catch(() => "customer");
      setState({ user, role, loading: false });
    });
  }, []);

  // After being made admin, pick up the new role without signing out.
  const refreshRole = useCallback(async () => {
    if (auth?.currentUser) await auth.currentUser.getIdToken(true);
  }, []);

  const value = useMemo(() => ({ ...state, refreshRole }), [state, refreshRole]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
