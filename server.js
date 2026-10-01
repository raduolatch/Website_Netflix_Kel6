const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === "production";
const DAY = 24 * 60 * 60 * 1000;

const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, "netplik.db"));
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
const findByEmail = db.prepare("SELECT * FROM users WHERE email = ?");
const findById = db.prepare("SELECT id, email, created_at FROM users WHERE id = ?");
const insertUser = db.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)");

const secretFile = path.join(dataDir, "secret.key");
const SECRET =
  process.env.SESSION_SECRET ||
  (fs.existsSync(secretFile)
    ? fs.readFileSync(secretFile, "utf8")
    : (() => {
        const s = crypto.randomBytes(48).toString("hex");
        fs.writeFileSync(secretFile, s, { mode: 0o600 });
        return s;
      })());

const hashPassword = (pw) => {
  const salt = crypto.randomBytes(16);
  return salt.toString("hex") + ":" + crypto.scryptSync(pw, salt, 64).toString("hex");
};
const DUMMY_HASH = hashPassword("dummy");
const verifyPassword = (pw, stored) => {
  const [salt, hash] = stored.split(":");
  const test = crypto.scryptSync(pw, Buffer.from(salt, "hex"), 64);
  return crypto.timingSafeEqual(test, Buffer.from(hash, "hex"));
};

const sign = (data) => crypto.createHmac("sha256", SECRET).update(data).digest("base64url");
function makeToken(userId, ttlMs) {
  const body = Buffer.from(JSON.stringify({ sub: userId, exp: Date.now() + ttlMs })).toString("base64url");
  return body + "." + sign(body);
}
function readToken(token) {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const good = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (good.length !== given.length || !crypto.timingSafeEqual(good, given)) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString());
  return payload.exp > Date.now() ? payload : null;
}

/* ---------- Helper HTTP ---------- */
const json = (res, status, data, headers = {}) => {
  res.writeHead(status, { "Content-Type": "application/json", ...headers });
  res.end(JSON.stringify(data));
};
const parseCookies = (req) =>
  Object.fromEntries((req.headers.cookie || "").split(";").map((c) => c.trim().split("=")).filter((p) => p[0]));
const cookie = (value, maxAgeSec) =>
  `token=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}${IS_PROD ? "; Secure" : ""}`;

function readBody(req) {
  return new Promise((resolve, reject) => {
    if (!(req.headers["content-type"] || "").startsWith("application/json")) return reject({ status: 415, msg: "Content-Type harus application/json." });
    let size = 0, raw = "";
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 10_000) { reject({ status: 413, msg: "Request terlalu besar." }); req.destroy(); }
      raw += chunk;
    });
    req.on("end", () => { try { resolve(JSON.parse(raw || "{}")); } catch { reject({ status: 400, msg: "JSON tidak valid." }); } });
  });
}

const fails = new Map();
const WINDOW = 15 * 60 * 1000, MAX_FAILS = 10;
const exempt = (ip) => !IS_PROD && ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(ip);
const recent = (ip) => {
  const list = (fails.get(ip) || []).filter((t) => Date.now() - t < WINDOW);
  fails.set(ip, list);
  return list;
};
const blocked = (ip) => !exempt(ip) && recent(ip).length >= MAX_FAILS;
const addFail = (ip) => { recent(ip).push(Date.now()); };
const clearFails = (ip) => fails.delete(ip);

const currentUser = (req) => {
  const p = readToken(parseCookies(req).token);
  return p ? findById.get(p.sub) : null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const html = fs.readFileSync(path.join(__dirname, "index.html"));

const ASSETS = {
  "/Letter_N-removebg-preview.png": "image/png",
  "/netflix-background-image.jpg": "image/jpeg",
};

const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "same-origin");
  const { pathname } = new URL(req.url, "http://localhost");

  try {
    if (req.method === "GET" && (pathname === "/" || pathname === "/index.html")) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(html);
    }

    if (req.method === "GET" && ASSETS[pathname]) {
      const file = path.join(__dirname, pathname);
      if (!fs.existsSync(file)) return json(res, 404, { error: "File tidak ditemukan: " + pathname.slice(1) });
      res.writeHead(200, { "Content-Type": ASSETS[pathname], "Cache-Control": "public, max-age=86400" });
      return fs.createReadStream(file).pipe(res);
    }

    if (req.method === "GET" && pathname === "/api/auth/me") {
      const user = currentUser(req);
      return user ? json(res, 200, { user }) : json(res, 401, { error: "Belum login atau sesi sudah berakhir." });
    }

    if (req.method === "POST" && pathname === "/api/auth/logout") {
      return json(res, 200, { ok: true }, { "Set-Cookie": cookie("", 0) });
    }

    if (req.method === "POST" && (pathname === "/api/auth/register" || pathname === "/api/auth/login")) {
      const ip = req.socket.remoteAddress;
      if (blocked(ip)) return json(res, 429, { error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." });
      const body = await readBody(req);
      const email = String(body.email || "").trim().toLowerCase();
      const password = String(body.password || "");

      if (pathname.endsWith("/register")) {
        if (!EMAIL_RE.test(email) || email.length > 254) return addFail(ip), json(res, 400, { error: "Format email tidak valid." });
        if (password.length < 8 || password.length > 128) return addFail(ip), json(res, 400, { error: "Password harus 8 sampai 128 karakter." });
        if (findByEmail.get(email)) return addFail(ip), json(res, 409, { error: "Email sudah terdaftar. Silakan Sign In." });
        const id = Number(insertUser.run(email, hashPassword(password)).lastInsertRowid);
        clearFails(ip);
        return json(res, 201, { user: { id, email } }, { "Set-Cookie": cookie(makeToken(id, 7 * DAY), 7 * 86400) });
      }

      const user = findByEmail.get(email);
      const ok = verifyPassword(password, user ? user.password_hash : DUMMY_HASH);
      if (!user || !ok) return addFail(ip), json(res, 401, { error: "Email atau password salah." });
      clearFails(ip);
      const days = body.remember === true ? 30 : 7;
      return json(res, 200, { user: { id: user.id, email: user.email } }, { "Set-Cookie": cookie(makeToken(user.id, days * DAY), days * 86400) });
    }

    json(res, 404, { error: "Tidak ditemukan." });
  } catch (err) {
    if (err && err.status) return json(res, err.status, { error: err.msg });
    if (String(err && err.message).includes("UNIQUE")) return json(res, 409, { error: "Email sudah terdaftar. Silakan Sign In." });
    console.error(err);
    json(res, 500, { error: "Terjadi kesalahan di server." });
  }
});

server.listen(PORT, () => console.log(`Netplik berjalan di http://localhost:${PORT}`));