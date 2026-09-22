/**
 * POST /api/auth/login
 * Authenticate a user with email + password.
 * Body: { email, password }
 * Returns: { token, user }
 */

const bcrypt = require('bcryptjs');
const { connectToDatabase } = require('../lib/db');
const { generateToken, handleCors } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { db } = await connectToDatabase();
    const usersCol = db.collection('users');

    const user = await usersCol.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Update last login
    await usersCol.updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date() } }
    );

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role || 'user'
    });

    // Return user profile (without password)
    const { password: _, ...userProfile } = user;
    userProfile._id = user._id.toString();

    return res.status(200).json({ token, user: userProfile });
  } catch (error) {
    console.error('[SMMTOOL] Login error:', error);
    return res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
};
