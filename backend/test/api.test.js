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
            async delete() {
              delete table(name)[id];
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

// ---------------------------------------------------------------------------
// Security edge cases
// ---------------------------------------------------------------------------

const fieldsOf = async (res) => (await res.json()).fields ?? {};

describe("enquiry form: hostile input", () => {
  let ctx;
  before(async () => (ctx = await startServer({ enquiryLimitPerHour: 1000 })));
  after(() => ctx.server.close());

  const attacks = {
    "script tag in name": { name: "<script>alert(1)</script>" },
    "img onerror in message": { message: 'Nice <img src=x onerror="alert(1)">' },
    "closing tag": { message: "hello </textarea><b>bold</b>" },
    "html comment": { message: "<!-- hidden -->" },
    "spaced tag": { name: "< script >" },
    "encoded tag": { message: "&lt;script&gt;alert(1)&lt;/script&gt;" },
    "numeric entity tag": { message: "&#60;img src=x&#62;" },
    "javascript: link": { message: "click javascript:alert(document.cookie)" },
    "javascript: with spaces/case": { artwork: "JaVaScRiPt :alert(1)" },
    "svg payload": { message: "<svg onload=alert(1)>" },
  };
  for (const [label, override] of Object.entries(attacks)) {
    it(`rejects ${label}`, async () => {
      const before = ctx.db.added.length;
      const res = await post(ctx.base, { ...validEnquiry, ...override });
      assert.equal(res.status, 400, label);
      const fields = await fieldsOf(res);
      const key = Object.keys(override)[0];
      assert.match(fields[key][0], /HTML or code/);
      assert.equal(ctx.db.added.length, before, "nothing saved");
    });
  }

  it("allows normal text that contains < and quotes", async () => {
    const res = await post(ctx.base, {
      ...validEnquiry,
      message: "I <3 this piece! Is 2 < 3 metres too big? It's \"perfect\" & lovely; DROP TABLE is just words.",
    });
    assert.equal(res.status, 201);
  });

  it("stores SQL-looking text as plain data (there is no SQL to inject into)", async () => {
    const res = await post(ctx.base, { ...validEnquiry, name: "Robert'); DROP TABLE students;--" });
    assert.equal(res.status, 201);
    assert.equal(ctx.db.added.at(-1).doc.name, "Robert'); DROP TABLE students;--");
  });

  const wrongTypes = {
    "object instead of string (NoSQL operator)": { email: { $gt: "" } },
    "array instead of string": { name: ["a", "b"] },
    "number instead of string": { message: 12345 },
    "null name": { name: null },
    "boolean": { name: true },
  };
  for (const [label, override] of Object.entries(wrongTypes)) {
    it(`rejects ${label}`, async () => {
      const res = await post(ctx.base, { ...validEnquiry, ...override });
      assert.equal(res.status, 400);
    });
  }

  it("rejects a JSON array or string body", async () => {
    assert.equal((await post(ctx.base, [validEnquiry])).status, 400);
    assert.equal((await post(ctx.base, '"just a string"')).status, 400);
  });

  it("ignores non-JSON content types", async () => {
    const res = await fetch(`${ctx.base}/api/enquiries`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(validEnquiry),
    });
    assert.equal(res.status, 400);
  });

  it("does not let __proto__ or extra fields through", async () => {
    const res = await post(
      ctx.base,
      '{"name":"Sam","email":"sam@example.com","message":"Hi","__proto__":{"admin":true},"role":"admin","uid":"someone-else"}'
    );
    assert.equal(res.status, 201);
    const doc = ctx.db.added.at(-1).doc;
    assert.equal(doc.role, undefined);
    assert.equal(doc.uid, undefined, "visitors can't claim a uid");
    assert.equal({}.admin, undefined, "Object prototype untouched");
  });

  it("strips invisible and control characters, and newlines from the name", async () => {
    const res = await post(ctx.base, {
      ...validEnquiry,
      name: "Sa\u200Bm\u0000 \u202Eevil\nBcc: x@y.com",
      message: "line1\r\nline2\u0007",
    });
    assert.equal(res.status, 201);
    const doc = ctx.db.added.at(-1).doc;
    assert.equal(doc.name, "Sam evil Bcc: x@y.com");
    assert.equal(doc.message, "line1\nline2");
  });

  it("rejects email header injection and odd emails", async () => {
    for (const email of ["sam@example.com\nBcc: a@b.com", "sam@", "@example.com", "sam example@x.com", "a".repeat(250) + "@x.com"]) {
      const res = await post(ctx.base, { ...validEnquiry, email });
      assert.equal(res.status, 400, email);
    }
  });

  it("treats whitespace-only fields as empty", async () => {
    const res = await post(ctx.base, { name: "   ", email: "sam@example.com", message: "\n\t \u200B" });
    assert.equal(res.status, 400);
    const fields = await fieldsOf(res);
    assert.ok(fields.name && fields.message);
  });

  it("enforces length limits after cleaning", async () => {
    const res = await post(ctx.base, { ...validEnquiry, name: "x".repeat(101) });
    assert.equal(res.status, 400);
  });

  it("normalises email case", async () => {
    await post(ctx.base, { ...validEnquiry, email: "  Sam@Example.COM " });
    assert.equal(ctx.db.added.at(-1).doc.email, "sam@example.com");
  });
});

describe("ids and paths", () => {
  let ctx;
  before(async () => (ctx = await startServer()));
  after(() => ctx.server.close());

  for (const id of ["..%2Fusers%2Fx", "a%2Fb", "%00", "a.b", "-start", "x".repeat(101), "%24where"]) {
    it(`404s for artwork id ${id.slice(0, 20)}`, async () => {
      const res = await fetch(`${ctx.base}/api/artworks/${id}`);
      assert.equal(res.status, 404);
    });
  }

  it("ignores object-shaped query params", async () => {
    const res = await fetch(`${ctx.base}/api/artworks?status[$ne]=sold`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).artworks.length, 3, "filter ignored, not misapplied");
  });

  it("admin ids are checked too", async () => {
    const res = await call(ctx.base, "/admin/enquiries/a%2Fb", { token: "admin-token", method: "PATCH", body: { handled: true } });
    assert.equal(res.status, 404);
  });
});

// ---------------------------------------------------------------------------
// Admin: images and adding/editing/deleting paintings
// ---------------------------------------------------------------------------

const CLOUD = "https://res.cloudinary.com/demo/image/upload/";
function fakeImageStore() {
  const uploads = [];
  return {
    uploads,
    owns: (url) => typeof url === "string" && url.startsWith(CLOUD),
    async upload(buffer, { contentType, publicId }) {
      uploads.push({ size: buffer.length, contentType, publicId });
      return { url: `${CLOUD}v1/${publicId}.jpg`, width: 800, height: 1000 };
    },
  };
}

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200)]);
const upload = (base, body, { token = "admin-token", type = "image/jpeg", name = "my painting" } = {}) =>
  fetch(`${base}/api/admin/images?name=${encodeURIComponent(name)}`, {
    method: "POST",
    headers: { "Content-Type": type, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body,
  });

describe("admin image upload", () => {
  let ctx, images;
  before(async () => {
    images = fakeImageStore();
    ctx = await startServer({ imageStore: images });
  });
  after(() => ctx.server.close());

  it("uploads a real JPEG or PNG", async () => {
    const res = await upload(ctx.base, JPEG);
    assert.equal(res.status, 201);
    assert.ok((await res.json()).url.startsWith(CLOUD));
    assert.equal((await upload(ctx.base, PNG, { type: "image/png" })).status, 201);
    assert.match(images.uploads[0].publicId, /^artworks\/uploads\/my-painting-[0-9a-f]{8}$/);
  });

  it("checks the file contents, not the claimed type", async () => {
    const html = Buffer.from("<html><script>alert(1)</script></html>".padEnd(64));
    assert.equal((await upload(ctx.base, html, { type: "image/jpeg" })).status, 415);
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>');
    assert.equal((await upload(ctx.base, svg, { type: "image/svg+xml" })).status, 415);
    assert.equal((await upload(ctx.base, Buffer.alloc(0))).status, 400);
  });

  it("rejects files over 10 MB", async () => {
    const big = Buffer.concat([JPEG, Buffer.alloc(10 * 1024 * 1024)]);
    assert.equal((await upload(ctx.base, big)).status, 413);
  });

  it("only admins can upload", async () => {
    const before = images.uploads.length;
    assert.equal((await upload(ctx.base, JPEG, { token: null })).status, 401);
    assert.equal((await upload(ctx.base, JPEG, { token: "user-token" })).status, 403);
    assert.equal(images.uploads.length, before);
  });

  it("cleans the file name used for storage", async () => {
    await upload(ctx.base, JPEG, { name: "../../etc/passwd <script>" });
    assert.match(images.uploads.at(-1).publicId, /^artworks\/uploads\/etc-passwd-script-[0-9a-f]{8}$/);
  });

  it("explains when uploads aren't configured", async () => {
    const other = await startServer();
    try {
      assert.equal((await upload(other.base, JPEG)).status, 503);
    } finally {
      other.server.close();
    }
  });
});

describe("admin: add, edit and delete paintings", () => {
  let ctx;
  before(async () => (ctx = await startServer({ imageStore: fakeImageStore() })));
  after(() => ctx.server.close());

  const newPainting = {
    title: "Morning Light",
    collection: "Original Paintings",
    year: "2026",
    size: "60cm x 80cm",
    medium: "Acrylic on canvas",
    description: "A quiet sunrise.\n\nPainted with a palette knife.",
    prophetic_word: "New mercies, every morning.",
    scripture_reference: "Lamentations 3:22-23",
    price: 1450.5,
    status: "available",
    image_url: `${CLOUD}v1/artworks/uploads/morning-light-1234abcd.jpg`,
  };
  const create = (body, token = "admin-token") => call(ctx.base, "/admin/artworks", { token, method: "POST", body });

  it("adds a painting that appears on the public site at the end of the list", async () => {
    const res = await create(newPainting);
    assert.equal(res.status, 201);
    const { artwork } = await res.json();
    assert.equal(artwork.id, "morning-light");
    assert.equal(artwork.price, 1450.5);
    assert.equal(artwork.artist, "Ricky B. Salim");

    const { artworks } = await (await fetch(`${ctx.base}/api/artworks`)).json();
    assert.equal(artworks.at(-1).id, "morning-light");
  });

  it("gives a repeated title a unique id", async () => {
    const { artwork } = await (await create(newPainting)).json();
    assert.equal(artwork.id, "morning-light-2");
  });

  it("only needs title, collection and image", async () => {
    const res = await create({ title: "Small Study", collection: "Carrot Cards", image_url: newPainting.image_url });
    assert.equal(res.status, 201);
    const { artwork } = await res.json();
    assert.equal(artwork.status, "available");
    assert.equal(artwork.price, null);
  });

  it("rejects missing or invalid fields with messages per field", async () => {
    const res = await create({ collection: "Sculptures", price: -5, year: "26", status: "free", image_url: "https://evil.example/x.jpg" });
    assert.equal(res.status, 400);
    const fields = await fieldsOf(res);
    for (const key of ["title", "collection", "price", "year", "status", "image_url"]) {
      assert.ok(fields[key], `expected error for ${key}`);
    }
  });

  it("rejects scripts in any text field and unknown fields", async () => {
    for (const key of ["title", "description", "prophetic_word", "medium", "size", "scripture_reference"]) {
      const res = await create({ ...newPainting, [key]: "<script>alert(1)</script>" });
      assert.equal(res.status, 400, key);
    }
    assert.equal((await create({ ...newPainting, sort_order: -1 })).status, 400);
    assert.equal((await create({ ...newPainting, image_url: "javascript:alert(1)" })).status, 400);
    assert.equal((await create({ ...newPainting, image_url: "data:image/svg+xml,<svg onload=alert(1)>" })).status, 400);
  });

  it("customers can't add, edit or delete", async () => {
    assert.equal((await create(newPainting, "user-token")).status, 403);
    assert.equal((await call(ctx.base, "/admin/artworks/a", { token: "user-token", method: "DELETE" })).status, 403);
  });

  it("edits details", async () => {
    const res = await call(ctx.base, "/admin/artworks/morning-light", {
      token: "admin-token",
      method: "PATCH",
      body: { title: "Morning Light II", description: "Updated", price: null },
    });
    assert.equal(res.status, 200);
    const { artwork } = await (await fetch(`${ctx.base}/api/artworks/morning-light`)).json();
    assert.equal(artwork.title, "Morning Light II");
    assert.equal(artwork.price, null);
  });

  it("rejects an empty edit", async () => {
    const res = await call(ctx.base, "/admin/artworks/morning-light", { token: "admin-token", method: "PATCH", body: {} });
    assert.equal(res.status, 400);
  });

  it("deletes a painting", async () => {
    const res = await call(ctx.base, "/admin/artworks/morning-light-2", { token: "admin-token", method: "DELETE" });
    assert.equal(res.status, 200);
    assert.equal((await fetch(`${ctx.base}/api/artworks/morning-light-2`)).status, 404);
    const again = await call(ctx.base, "/admin/artworks/morning-light-2", { token: "admin-token", method: "DELETE" });
    assert.equal(again.status, 404);
  });
});
