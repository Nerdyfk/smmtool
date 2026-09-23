/**
 * POST /api/auth/register
 * Register a new user account.
 * Body: { email, password, username, name? }
 * Returns: { token, user }
 */

const bcrypt = require('bcryptjs');
const { connectToDatabase } = require('../../_lib/db');
const { generateToken, handleCors } = require('../../_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, username, name } = req.body || {};

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Username must be 3-30 characters.' });
    }

    const { db } = await connectToDatabase();
    const usersCol = db.collection('users');

    // Check if email or username already exists
    const existingUser = await usersCol.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() }
      ]
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      return res.status(409).json({ error: 'This username is already taken.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate API key
    const apiKey = 'smmtool_live_' + Array.from({ length: 16 }, () =>
      '0123456789abcdef'[Math.floor(Math.random() * 16)]
    ).join('');

    const newUser = {
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password: hashedPassword,
      name: name || username,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || username)}&background=a855f7&color=fff&size=100`,
      balance: 0.00,
      totalSpent: 0.00,
      ordersCount: 0,
      apiKey,
      tier: 'Starter',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await usersCol.insertOne(newUser);
    const userId = result.insertedId.toString();

    const token = generateToken({
      userId,
      email: newUser.email,
      role: newUser.role
    });

    // Return user profile (without password)
    const { password: _, ...userProfile } = newUser;
    userProfile._id = userId;

    return res.status(201).json({ token, user: userProfile });
  } catch (error) {
    console.error('[SMMTOOL] Registration error:', error);
    return res.status(500).json({ error: 'Internal server error. Please try again.' });
  }
};
