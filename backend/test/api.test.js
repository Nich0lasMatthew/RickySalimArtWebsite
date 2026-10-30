import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createApp } from "../src/app.js";

// Minimal in-memory stand-in for the parts of Firestore the API uses.
function fakeDb(seed = {}) {
  const data = structuredClone(seed);
  const added = [];
  const table = (name) => (data[name] ??= {});
  const snapshot = (name) =>
    Object.entries(table(name)).map(([id, doc]) => ({ id, data: () => doc }));

  return {
    added,
    data,
    collection(name) {
      const ordered = (field, dir = "asc") => {
        const query = {
          limit: () => query,
          async get() {
            const rows = snapshot(name).sort((a, b) =>
              a.data()[field] > b.data()[field] ? 1 : -1
            );
            return { docs: dir === "desc" ? rows.reverse() : rows };
          },
        };
        return query;
      };
      return {
        orderBy: ordered,
        async add(doc) {
          added.push({ collection: name, doc });
          const id = `new-${added.length}`;
          table(name)[id] = doc;
          return { id };
        },
        doc(id) {
          return {
            async get() {
              return { exists: id in table(name), data: () => table(name)[id] };
            },
            async set(doc, { merge } = {}) {
              table(name)[id] = merge ? { ...table(name)[id], ...doc } : doc;
            },
            async update(doc) {
              table(name)[id] = { ...table(name)[id], ...doc };
            },
          };
        },
      };
    },
  };
}

// Fake token checker: "admin-token" is an admin, "user-token" a customer.
async function fakeVerifyToken(token) {
  if (token === "admin-token") return { uid: "u-admin", email: "ricky@example.com", admin: true };
  if (token === "user-token") return { uid: "u-1", email: "sam@example.com" };
  throw new Error("invalid token");
}

const catalog = {
  artworks: {
    b: { title: "B", collection: "Carrot Cards", status: "sold", sort_order: 2 },
    a: { title: "A", collection: "Original Paintings", status: "available", sort_order: 1 },
    c: { title: "C", collection: "Carrot Cards", status: "available", sort_order: 3 },
  },
};

async function startServer(options = {}) {
  const db = fakeDb(catalog);
  const app = createApp({ db, verifyToken: fakeVerifyToken, corsOrigins: ["https://good.example"], ...options });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  return { db, server, base: `http://127.0.0.1:${server.address().port}` };
}

const post = (base, body, headers = {}) =>
  fetch(`${base}/api/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const validEnquiry = {
  name: "Sam",
  email: "sam@example.com",
  message: "Is this still available?",
  artwork: "ARMS",
};

describe("artworks", () => {
  let ctx;
  before(async () => (ctx = await startServer()));
  after(() => ctx.server.close());

  it("health check", async () => {
    const res = await fetch(`${ctx.base}/api/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  });

  it("lists artworks in sort_order with ids", async () => {
    const { artworks } = await (await fetch(`${ctx.base}/api/artworks`)).json();
    assert.deepEqual(artworks.map((a) => a.id), ["a", "b", "c"]);
  });

  it("filters by collection and status", async () => {
    const url = `${ctx.base}/api/artworks?collection=${encodeURIComponent("Carrot Cards")}&status=available`;
    const { artworks } = await (await fetch(url)).json();
    assert.deepEqual(artworks.map((a) => a.id), ["c"]);
  });

  it("returns one artwork, or 404", async () => {
    const ok = await fetch(`${ctx.base}/api/artworks/a`);
    assert.equal(ok.status, 200);
    assert.equal((await ok.json()).artwork.title, "A");

    const missing = await fetch(`${ctx.base}/api/artworks/nope`);
    assert.equal(missing.status, 404);
  });

  it("unknown API routes return JSON 404", async () => {
    const res = await fetch(`${ctx.base}/api/nothing`);
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: "Not found" });
  });

  it("CORS only allows listed origins", async () => {
    const good = await fetch(`${ctx.base}/api/health`, {
      headers: { Origin: "https://good.example" },
    });
    assert.equal(good.headers.get("access-control-allow-origin"), "https://good.example");

    const bad = await fetch(`${ctx.base}/api/health`, {
      headers: { Origin: "https://evil.example" },
    });
    assert.equal(bad.headers.get("access-control-allow-origin"), null);
  });
});

describe("enquiries", () => {
  let ctx;
  before(async () => (ctx = await startServer({ enquiryLimitPerHour: 100 })));
  after(() => ctx.server.close());

  it("saves a valid enquiry with a server timestamp", async () => {
    const res = await post(ctx.base, validEnquiry);
    assert.equal(res.status, 201);
    const saved = ctx.db.added.at(-1);
    assert.equal(saved.collection, "enquiries");
    assert.equal(saved.doc.name, "Sam");
    assert.equal(saved.doc.artwork, "ARMS");
    assert.ok(saved.doc.createdAt, "createdAt set");
  });

  it("rejects invalid input with field errors", async () => {
    const before = ctx.db.added.length;
    const res = await post(ctx.base, { name: "", email: "not-an-email", message: "" });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.fields.name && body.fields.email && body.fields.message);
    assert.equal(ctx.db.added.length, before);
  });

  it("ignores unknown fields", async () => {
    await post(ctx.base, { ...validEnquiry, isAdmin: true });
    assert.equal("isAdmin" in ctx.db.added.at(-1).doc, false);
  });

  it("honeypot returns success but saves nothing", async () => {
    const before = ctx.db.added.length;
    const res = await post(ctx.base, { ...validEnquiry, website: "http://spam.example" });
    assert.equal(res.status, 201);
    assert.equal(ctx.db.added.length, before);
  });

  it("rejects malformed JSON", async () => {
    const res = await post(ctx.base, "{not json");
    assert.equal(res.status, 400);
  });

  it("rejects oversized bodies", async () => {
    const res = await post(ctx.base, { ...validEnquiry, message: "x".repeat(20_000) });
    assert.equal(res.status, 413);
  });
});

describe("enquiry rate limit", () => {
  it("returns 429 after the limit", async () => {
    const ctx = await startServer({ enquiryLimitPerHour: 1 });
    try {
      assert.equal((await post(ctx.base, validEnquiry)).status, 201);
      assert.equal((await post(ctx.base, validEnquiry)).status, 429);
    } finally {
      ctx.server.close();
    }
  });
});

const call = (base, path, { token, method = "GET", body } = {}) =>
  fetch(`${base}/api${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

describe("accounts and roles", () => {
  let ctx;
  before(async () => (ctx = await startServer({ enquiryLimitPerHour: 100 })));
  after(() => ctx.server.close());

  it("/me needs a valid token", async () => {
    assert.equal((await call(ctx.base, "/me")).status, 401);
    assert.equal((await call(ctx.base, "/me", { token: "forged" })).status, 401);
  });

  it("/me returns the role and creates a user document", async () => {
    const res = await call(ctx.base, "/me", { token: "user-token" });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).user.role, "customer");
    assert.equal(ctx.db.data.users["u-1"].email, "sam@example.com");

    const admin = await call(ctx.base, "/me", { token: "admin-token" });
    assert.equal((await admin.json()).user.role, "admin");
  });

  it("admin routes: 401 for visitors, 403 for customers", async () => {
    assert.equal((await call(ctx.base, "/admin/enquiries")).status, 401);
    assert.equal((await call(ctx.base, "/admin/enquiries", { token: "user-token" })).status, 403);
    const patch = await call(ctx.base, "/admin/artworks/a", {
      token: "user-token",
      method: "PATCH",
      body: { price: 1 },
    });
    assert.equal(patch.status, 403);
  });

  it("enquiries from signed-in users record their uid", async () => {
    await post(ctx.base, validEnquiry, { Authorization: "Bearer user-token" });
    assert.equal(ctx.db.added.at(-1).doc.uid, "u-1");
  });

  it("admin can list enquiries", async () => {
    const res = await call(ctx.base, "/admin/enquiries", { token: "admin-token" });
    assert.equal(res.status, 200);
    assert.ok((await res.json()).enquiries.length >= 1);
  });

  it("admin can update price and status, and the public list updates immediately", async () => {
    await fetch(`${ctx.base}/api/artworks`); // warm the cache
    const res = await call(ctx.base, "/admin/artworks/a", {
      token: "admin-token",
      method: "PATCH",
      body: { price: 1200, status: "reserved" },
    });
    assert.equal(res.status, 200);
    const { artwork } = await (await fetch(`${ctx.base}/api/artworks/a`)).json();
    assert.equal(artwork.price, 1200);
    assert.equal(artwork.status, "reserved");
    assert.equal(artwork.updatedBy, "ricky@example.com");
  });

  it("admin updates are validated", async () => {
    const bad = await call(ctx.base, "/admin/artworks/a", {
      token: "admin-token",
      method: "PATCH",
      body: { status: "free", sort_order: -1 },
    });
    assert.equal(bad.status, 400);
    const missing = await call(ctx.base, "/admin/artworks/nope", {
      token: "admin-token",
      method: "PATCH",
      body: { price: 5 },
    });
    assert.equal(missing.status, 404);
  });
});
