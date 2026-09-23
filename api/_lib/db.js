/**
 * SMMTOOL Pro — MongoDB Connection Singleton
 * Caches the MongoClient connection across serverless invocations
 * to avoid reconnecting on every request (Vercel cold start optimization).
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.MONGODB_DB || 'smmtool';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'smmtool';

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set. Add it in Vercel Dashboard → Settings → Environment Variables.');
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

/**
 * Seed initial services data into MongoDB if the services collection is empty.
 * Called lazily on first service-related request.
 */
async function seedServicesIfEmpty(db, servicesData) {
  const count = await db.collection('services').countDocuments();
  if (count === 0 && servicesData && servicesData.length > 0) {
    const docs = servicesData.map((s, i) => ({
      serviceId: s.id || i + 1,
      platform: s.platform,
      category: s.category,
      name: s.name,
      description: s.description || '',
      ratePer1k: s.ratePer1k,
      minOrder: s.minOrder || 100,
      maxOrder: s.maxOrder || 100000,
      speed: s.speed || 'Instant',
      status: s.status || 'active',
      quality: s.quality || 'HQ',
      refillDays: s.refillDays || 0,
      createdAt: new Date()
    }));
    await db.collection('services').insertMany(docs);
    console.log(`[SMMTOOL] Seeded ${docs.length} services into MongoDB`);
  }
}

const handler = (req, res) => {
  if (res && res.status) return res.status(404).json({ error: 'Not an API endpoint' });
};
handler.connectToDatabase = connectToDatabase;
handler.seedServicesIfEmpty = seedServicesIfEmpty;

module.exports = handler;
module.exports.connectToDatabase = connectToDatabase;
module.exports.seedServicesIfEmpty = seedServicesIfEmpty;

