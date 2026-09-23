/**
 * POST /api/admin/seed
 * Seed initial services data into MongoDB from the TOOLKITY_DATA static file.
 * This is a one-time setup endpoint.
 * Requires admin JWT.
 */

const { connectToDatabase } = require('../_lib/db');
const { requireAdmin, handleCors } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    const { services } = req.body || {};

    if (!services || !Array.isArray(services) || services.length === 0) {
      return res.status(400).json({ error: 'Services array is required in request body.' });
    }

    const { db } = await connectToDatabase();
    const servicesCol = db.collection('services');

    // Check if already seeded
    const existingCount = await servicesCol.countDocuments();
    if (existingCount > 0) {
      return res.status(200).json({
        message: `Database already has ${existingCount} services. Use the admin services panel to manage them.`,
        seeded: false,
        existingCount
      });
    }

    // Transform and insert
    const docs = services.map((s, i) => ({
      serviceId: s.id || i + 1,
      platform: s.platform || 'Unknown',
      category: s.category || 'General',
      name: s.name || `Service ${i + 1}`,
      description: s.description || '',
      ratePer1k: parseFloat(s.ratePer1k) || 0.01,
      minOrder: parseInt(s.minOrder) || 100,
      maxOrder: parseInt(s.maxOrder) || 100000,
      speed: s.speed || 'Instant',
      status: s.status || 'active',
      quality: s.quality || 'HQ',
      refillDays: parseInt(s.refillDays) || 0,
      createdAt: new Date()
    }));

    const result = await servicesCol.insertMany(docs);

    return res.status(201).json({
      message: `Successfully seeded ${result.insertedCount} services into MongoDB.`,
      seeded: true,
      count: result.insertedCount
    });
  } catch (error) {
    console.error('[SMMTOOL] Seed error:', error);
    return res.status(500).json({ error: 'Failed to seed services.' });
  }
};
