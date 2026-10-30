import { createContext, useContext } from "react";

/**
 * { user, role, loading, refreshRole }
 *   role: "visitor" | "customer" | "admin"
 * The role here only decides what the UI shows. The API checks the token
 * itself, so hiding a button is never the thing that keeps data safe.
 */
export const AuthContext = createContext({
  user: null,
  role: "visitor",
  loading: false,
  refreshRole: async () => {},
});

export const useAuth = () => useContext(AuthContext);
