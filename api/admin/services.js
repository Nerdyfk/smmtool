/**
 * GET/PUT /api/admin/services
 * GET: List all services (with admin metadata — includes paused)
 * PUT: Update service pricing, status, limits, or add new service
 * Requires admin JWT.
 */

const { connectToDatabase } = require('../lib/db');
const { requireAdmin, handleCors } = require('../lib/auth');

module.exports = async function handler(req, res) {
  if (handleCors(req, res)) return;

  const admin = requireAdmin(req, res);
  if (!admin) return;

  const { db } = await connectToDatabase();
  const servicesCol = db.collection('services');

  try {
    if (req.method === 'GET') {
      const { platform, status, search } = req.query || {};
      const filter = {};

      if (platform && platform !== 'all') {
        filter.platform = { $regex: platform, $options: 'i' };
      }
      if (status && status !== 'all') {
        filter.status = status;
      }
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const services = await servicesCol.find(filter).sort({ serviceId: 1 }).toArray();
      return res.status(200).json({ services });
    }

    if (req.method === 'PUT') {
      const { action, service, serviceId, updates, markupPercent } = req.body || {};

      // Batch markup apply
      if (action === 'batchMarkup' && typeof markupPercent === 'number') {
        const allServices = await servicesCol.find({}).toArray();
        const bulkOps = allServices.map(s => ({
          updateOne: {
            filter: { _id: s._id },
            update: {
              $set: {
                ratePer1k: parseFloat((s.ratePer1k * (1 + markupPercent / 100)).toFixed(4)),
                updatedAt: new Date()
              }
            }
          }
        }));
        if (bulkOps.length > 0) {
          await servicesCol.bulkWrite(bulkOps);
        }
        return res.status(200).json({ message: `Applied ${markupPercent}% markup to ${bulkOps.length} services.` });
      }

      // Add new service
      if (action === 'add' && service) {
        const lastService = await servicesCol.find({}).sort({ serviceId: -1 }).limit(1).toArray();
        const nextId = (lastService[0]?.serviceId || 0) + 1;

        const newService = {
          serviceId: nextId,
          platform: service.platform,
          category: service.category,
          name: service.name,
          description: service.description || '',
          ratePer1k: parseFloat(service.ratePer1k) || 0.01,
          minOrder: parseInt(service.minOrder) || 100,
          maxOrder: parseInt(service.maxOrder) || 100000,
          speed: service.speed || 'Instant',
          status: 'active',
          quality: service.quality || 'HQ',
          refillDays: parseInt(service.refillDays) || 0,
          createdAt: new Date()
        };

        await servicesCol.insertOne(newService);
        return res.status(201).json({ message: 'Service added.', service: newService });
      }

      // Update existing service
      if (action === 'update' && serviceId && updates) {
        const allowedFields = ['name', 'ratePer1k', 'minOrder', 'maxOrder', 'speed', 'description', 'status', 'category', 'platform', 'quality', 'refillDays'];
        const safeUpdates = {};
        for (const key of allowedFields) {
          if (updates[key] !== undefined) {
            safeUpdates[key] = updates[key];
          }
        }
        safeUpdates.updatedAt = new Date();

        await servicesCol.updateOne(
          { serviceId: parseInt(serviceId) },
          { $set: safeUpdates }
        );
        return res.status(200).json({ message: 'Service updated.' });
      }

      // Toggle service status
      if (action === 'toggleStatus' && serviceId) {
        const svc = await servicesCol.findOne({ serviceId: parseInt(serviceId) });
        if (!svc) return res.status(404).json({ error: 'Service not found.' });

        const newStatus = svc.status === 'active' ? 'paused' : 'active';
        await servicesCol.updateOne(
          { serviceId: parseInt(serviceId) },
          { $set: { status: newStatus, updatedAt: new Date() } }
        );
        return res.status(200).json({ message: `Service ${newStatus}.`, status: newStatus });
      }

      // Delete service
      if (action === 'delete' && serviceId) {
        await servicesCol.deleteOne({ serviceId: parseInt(serviceId) });
        return res.status(200).json({ message: 'Service deleted.' });
      }

      return res.status(400).json({ error: 'Invalid action.' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[SMMTOOL] Admin services error:', error);
    return res.status(500).json({ error: 'Failed to process service request.' });
  }
};
