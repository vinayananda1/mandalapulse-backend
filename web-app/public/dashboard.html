// MandalaPulse Backend Invocation Scroll — Firestore Linked
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');

admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json()); // 🌬️ Parse JSON body

const db = admin.firestore(); // 🔗 Firestore invocation

// 🌸 Sacred POST route
app.post('/', async (req, res) => {
  const { username, password } = req.body;

  try {
    // 🌿 Retrieve document from LoginData collection
    const userDoc = await db.collection('LoginData').doc(username).get();

    if (!userDoc.exists) {
      return res.status(401).send({ success: false, message: 'User not found' });
    }

    const data = userDoc.data();

    // 🌬️ Normalize and compare passwords
    const inputPassword = password.trim();
    const storedPassword = data.password.trim();

    if (storedPassword === inputPassword) {
      res.status(200).send({ success: true, message: 'Welcome, Vinayananda' });
    } else {
      res.status(401).send({ success: false, message: 'Invalid password' });
    }
  } catch (error) {
    res.status(500).send({ success: false, message: 'Invocation error: ' + error.message });
  }
});

// 🌐 Export the function
exports.verifyLogin = functions.https.onRequest(app);