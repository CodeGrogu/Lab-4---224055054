// Minimal Express + MongoDB API that mirrors the PHP JSON API
// Usage: set MONGODB_URI and optionally PORT, then `node server.js`

const express = require('express');
const path = require('path');
const { MongoClient, ServerApiVersion } = require('mongodb');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB || 'lab';
const COLLECTION = process.env.MONGODB_COLLECTION || 'students';

const app = express();
app.use(express.json());

// Simple CORS for API (safe for local dev and GH Pages calling this API)
app.use('/api', (req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	if (req.method === 'OPTIONS') return res.sendStatus(204);
	next();
});

// Serve static files (open http://localhost:3000 to view the app)
app.use(express.static(__dirname));

function genId() {
	return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

let client; let col;

async function connectMongo() {
	if (!MONGODB_URI) {
		console.warn('MONGODB_URI not set. API will operate in memory only.');
		return null;
	}
	if (client) return client;
	client = new MongoClient(MONGODB_URI, {
		serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
	});
	await client.connect();
	const db = client.db(DB_NAME);
	col = db.collection(COLLECTION);
	return client;
}

// In-memory fallback if no Mongo URI provided
let memory = [];

app.get('/api/students', async (req, res) => {
	try {
		await connectMongo();
		if (col) {
			const docs = await col.find({}).sort({ _id: -1 }).toArray();
			// Keep shape consistent: docs already include `id` if created via API
			return res.json(docs.map(({ _id, ...rest }) => rest));
		}
		return res.json(memory);
	} catch (e) {
		console.error(e);
		res.status(500).json({ error: 'Failed to load' });
	}
});

app.post('/api/students', async (req, res) => {
	const { action, payload } = req.body || {};
	try {
		await connectMongo();
		if (action === 'delete') {
			const id = (payload && payload.id) || '';
			if (!id) return res.status(400).json({ error: 'Missing id' });
			if (col) await col.deleteOne({ id }); else memory = memory.filter(s => s.id !== id);
			return res.json({ ok: true, id });
		}
		if (action === 'upsert') {
			if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'Invalid payload' });
			const s = {
				id: String(payload.id || genId()),
				firstName: String(payload.firstName || '').trim(),
				lastName: String(payload.lastName || '').trim(),
				email: String(payload.email || '').trim(),
				programme: String(payload.programme || ''),
				yearOfStudy: String(payload.yearOfStudy || ''),
				interests: String(payload.interests || '').trim(),
				photoUrl: String(payload.photoUrl || '').trim(),
				registrationDate: String(payload.registrationDate || new Date().toISOString()),
			};
			if (col) {
				await col.updateOne({ id: s.id }, { $set: s }, { upsert: true });
			} else {
				const i = memory.findIndex(x => x.id === s.id);
				if (i >= 0) memory[i] = s; else memory.unshift(s);
			}
			return res.json({ ok: true, student: s });
		}
		res.status(400).json({ error: 'Unsupported action' });
	} catch (e) {
		console.error(e);
		res.status(500).json({ error: 'Failed to write' });
	}
});

app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});

