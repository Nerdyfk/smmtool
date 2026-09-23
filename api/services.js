/**
 * GET /api/services
 * Public endpoint: returns all active (non-paused) services with pricing.
 * No authentication required.
 */

const { connectToDatabase, seedServicesIfEmpty } = require('./_lib/db');
const { handleCors } = require('./_lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { db } = await connectToDatabase();
    const servicesCol = db.collection('services');

    // Check if services need seeding (first-time setup)
    const count = await servicesCol.countDocuments();
    if (count === 0) {
      // We'll handle seeding via admin or a separate seed script
      return res.status(200).json({ services: [] });
    }

    const { platform, category, search } = req.query || {};
    const filter = { status: 'active' };

    if (platform && platform !== 'all') {
      filter.platform = { $regex: platform, $options: 'i' };
    }
    if (category && category !== 'all') {
      filter.category = { $regex: category, $options: 'i' };
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const services = await servicesCol
      .find(filter)
      .project({ _id: 0, createdAt: 0, updatedAt: 0 })
      .sort({ platform: 1, serviceId: 1 })
      .toArray();

    return res.status(200).json({ services });
  } catch (error) {
    console.error('[SMMTOOL] Services list error:', error);
    return res.status(500).json({ error: 'Failed to load services.' });
  }
};
