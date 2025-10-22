// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');

admin.initializeApp();

const app = express();
const regApp = express();

const ALLOWED_ORIGIN = 'https://mandalapulse108.web.app'; // set your production origin
app.use(cors({ origin: ALLOWED_ORIGIN }));
regApp.use(cors({ origin: ALLOWED_ORIGIN }));

app.use(express.json({ limit: '10kb' }));
regApp.use(express.json({ limit: '10kb' }));

const rtdb = admin.database();
const LOGIN_PATH = 'AuthRegistry/LoginData';
const SALT_ROUNDS = 12;

// Utility: mask username for logs
function maskUsername(u) {
  if (!u) return '';
  const s = String(u);
  if (s.length <= 2) return s[0] + '*';
  return s[0] + '*'.repeat(Math.max(1, s.length - 2)) + s[s.length - 1];
}

// Helper: safe response for auth failures (avoid revealing user existence)
function authFail(res) {
  return res.status(401).json({ success: false, message: 'Invalid credentials' });
}

// Main verifyLogin route (POST only)
app.post('/', async (req, res) => {
  try {
    const { username = '', password = '' } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Missing username or password' });
    }

    const cleanUser = String(username).trim();
    const inputPassword = String(password);

    // Query RTDB for entries with matching username
    const snap = await rtdb.ref(LOGIN_PATH).orderByChild('username').equalTo(cleanUser).once('value');
    if (!snap.exists()) {
      // Do not reveal existence
      console.info(`verifyLogin: failed user=${maskUsername(cleanUser)} reason=no-user ts=${new Date().toISOString()}`);
      return authFail(res);
    }

    // Find the exact child node and its key
    let foundKey = null;
    let foundVal = null;
    snap.forEach(child => {
      const val = child.val();
      if (String(val.username).trim() === cleanUser) {
        foundKey = child.key;
        foundVal = val;
        return true; // stop iterating
      }
    });

    if (!foundVal || !foundKey) {
      console.info(`verifyLogin: failed user=${maskUsername(cleanUser)} reason=not-found-ts=${new Date().toISOString()}`);
      return authFail(res);
    }

    // Preferred: verify against passwordHash
    if (foundVal.passwordHash) {
      const match = await bcrypt.compare(inputPassword, foundVal.passwordHash);
      if (!match) {
        console.info(`verifyLogin: failed user=${maskUsername(cleanUser)} reason=bad-pass ts=${new Date().toISOString()}`);
        return authFail(res);
      }
      console.info(`verifyLogin: success user=${maskUsername(cleanUser)} via=hash ts=${new Date().toISOString()}`);
      return res.json({ success: true, message: `Welcome, ${cleanUser}` });
    }

    // Legacy fallback: plaintext migration if plaintext password present
    if (foundVal.password && String(foundVal.password) === inputPassword) {
      // Hash and atomically remove plaintext
      const hashed = await bcrypt.hash(inputPassword, SALT_ROUNDS);
      const updates = {};
      updates[`${LOGIN_PATH}/${foundKey}/passwordHash`] = hashed;
      updates[`${LOGIN_PATH}/${foundKey}/migratedAt`] = admin.database.ServerValue.TIMESTAMP;
      updates[`${LOGIN_PATH}/${foundKey}/password`] = null; // null removes field in RTDB update
      await rtdb.ref().update(updates);

      console.info(`verifyLogin: migrated user=${maskUsername(cleanUser)} ts=${new Date().toISOString()}`);
      return res.json({ success: true, message: `Welcome, ${cleanUser}` });
    }

    // No valid credential match
    console.info(`verifyLogin: failed user=${maskUsername(cleanUser)} reason=no-match ts=${new Date().toISOString()}`);
    return authFail(res);

  } catch (err) {
    console.error('verifyLogin:error', err && err.message ? err.message : String(err));
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// registerUser route: stores only passwordHash
regApp.post('/', async (req, res) => {
  try {
    const { username = '', password = '' } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'username and password required' });
    }

    const cleanUser = String(username).trim().slice(0, 128);
    const cleanPass = String(password).trim().slice(0, 256);

    const hash = await bcrypt.hash(cleanPass, SALT_ROUNDS);

    const newRef = rtdb.ref(LOGIN_PATH).push();
    await newRef.set({
      username: cleanUser,
      passwordHash: hash,
      createdAt: admin.database.ServerValue.TIMESTAMP
    });

    console.info(`registerUser: created key=${newRef.key} user=${maskUsername(cleanUser)} ts=${new Date().toISOString()}`);
    return res.json({ success: true, message: 'User created', key: newRef.key });

  } catch (err) {
    console.error('registerUser:error', err && err.message ? err.message : String(err));
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Export functions
exports.verifyLogin = functions.runWith({ memory: '256MB' }).https.onRequest(app);
exports.registerUser = functions.runWith({ memory: '256MB' }).https.onRequest(regApp);

// OPTIONAL: small protection guidance (not active code)
// - Add rate-limiting middleware in front of verifyLogin to limit brute-force attempts.
// - Consider issuing a short-lived session token on success (custom token or JWT) and return that instead of client-side storing credentials.