/* registerUser — create test accounts in Realtime DB */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

if (!admin.apps.length) admin.initializeApp();

const regApp = express();
regApp.use(cors({ origin: true }));
regApp.use(express.json());

const rtdb = admin.database();

regApp.post('/', async (req, res) => {
  try {
    const { username = '', password = '' } = req.body;
    if (!username || !password) {
      return res.status(400).send({ success: false, message: 'username and password required' });
    }
    const cleanUser = String(username).trim().slice(0, 128);
    const cleanPass = String(password).trim().slice(0, 256);

    const ref = rtdb.ref('AuthRegistry/LoginData').push();
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
