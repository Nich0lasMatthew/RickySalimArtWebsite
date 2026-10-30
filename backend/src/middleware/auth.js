/**
 * Who is calling? The browser signs in with Firebase Auth and sends its ID
 * token as "Authorization: Bearer <token>". We verify it with the Admin SDK.
 *
 * Roles:
 *  - visitor  : no token (or an invalid one) -> req.user is null
 *  - customer : any signed-in user
 *  - admin    : signed-in user with the custom claim { admin: true }
 *               (granted with `pnpm set-admin you@example.com`)
 *
 * `verifyToken` is injected so tests can fake it.
 */
export function authenticate(verifyToken) {
  return async (req, _res, next) => {
    req.user = null;
    const header = req.get("authorization") ?? "";
    const match = header.match(/^Bearer (.+)$/);
    if (!match || !verifyToken) return next();

    try {
      const decoded = await verifyToken(match[1]);
      req.user = {
        uid: decoded.uid,
        email: decoded.email ?? null,
        emailVerified: Boolean(decoded.email_verified),
        name: decoded.name ?? null,
        role: decoded.admin === true ? "admin" : "customer",
      };
    } catch {
      // Expired or forged token: treat as a visitor. Protected routes will 401.
      req.user = null;
    }
    next();
  };
}

export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Please sign in" });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Please sign in" });
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admins only" });
  next();
}
