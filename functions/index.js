/* MandalaPulse Backend Invocation Scroll — Realtime DB Linked */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const db = admin.database();

app.post('/', async (req, res) => {
  const { username = '', password = '' } = req.body;
  try {
    const snap = await db.ref('AuthRegistry/LoginData').orderByChild('username').equalTo(username).once('value');
    if (!snap.exists()) return res.status(401).send({ success: false, message: 'User not found' });

    let matched = null;
    snap.forEach(child => {
      const val = child.val();
      if (String(val.username).trim() === String(username).trim()) {
        matched = val;
        return true;
      }
    });

    if (!matched) return res.status(401).send({ success: false, message: 'User not found' });

    const inputPassword = String(password).trim();
    const storedPassword = String(matched.password || '').trim();

    if (storedPassword === inputPassword) {
      return res.status(200).send({ success: true, message: `Welcome, ${username}` });
    }
    return res.status(401).send({ success: false, message: 'Invalid password' });
  } catch (error) {
    return res.status(500).send({ success: false, message: 'Invocation error: ' + error.message });
  }
});

exports.verifyLogin = functions.https.onRequest(app);

// ensure registerUser is loaded
require('./register');

// --- registerUser (inlined to ensure export) ---
const express_reg = require('express');
const cors_reg = require('cors');

const regApp = express_reg();
regApp.use(cors_reg({ origin: true }));
regApp.use(express_reg.json());

const rtdb_reg = admin.database();

regApp.post('/', async (req, res) => {
  try {
    const { username = '', password = '' } = req.body;
    if (!username || !password) {
      return res.status(400).send({ success: false, message: 'username and password required' });
    }
    const cleanUser = String(username).trim().slice(0, 128);
    const cleanPass = String(password).trim().slice(0, 256);

    const ref = rtdb_reg.ref('AuthRegistry/LoginData').push();
    await ref.set({
      username: cleanUser,
      password: cleanPass,
      createdAt: Date.now()
    });

    console.log('registerUser: created', ref.key, cleanUser);
    return res.status(200).send({ success: true, message: 'User created', key: ref.key });
  } catch (err) {
    console.error('registerUser error', err);
    return res.status(500).send({ success: false, message: 'Error: ' + err.message });
  }
});

exports.registerUser = functions.https.onRequest(regApp);
// --- end registerUser ---
