const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();

const app = express();
// allow CORS from anywhere for now (you can lock origins later)
app.use(cors({ origin: true }));

// IMPORTANT: capture raw body for HMAC verification
app.use(express.json({
  verify: (req: any, res: any, buf: any) => { req.rawBody = buf; }
}));

// Webhook endpoint (POST)
app.post('/webhooks/orders', async (req: any, res: any) => {
  try {
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256') || '';
    const shopDomain = req.get('X-Shopify-Shop-Domain') || '';
    // const topic = req.get('X-Shopify-Topic') || '';

    // read secret from functions config: firebase functions:config:set shopify.secret="MYSECRET"
    const webhookSecret = functions.config().shopify && functions.config().shopify.secret;
    if (!webhookSecret) return res.status(500).send('missing secret config');

    // compute HMAC from raw body
    const computed = crypto.createHmac('sha256', webhookSecret).update(req.rawBody).digest('base64');
    if (!crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hmacHeader))) {
      return res.status(401).send('hmac fail');
    }

    const payload = req.body;
    const orderId = String(payload.id);

    // upsert order document
    const orderRef = db.collection('orders').doc(orderId);
    await orderRef.set({
      shop_domain: shopDomain,
      order_id: Number(payload.id),
      order_name: payload.name || null,
      created_at: payload.created_at ? admin.firestore.Timestamp.fromDate(new Date(payload.created_at)) : null,
      updated_at: payload.updated_at ? admin.firestore.Timestamp.fromDate(new Date(payload.updated_at)) : null,
      fulfillment_status: payload.fulfillment_status || null,
      tags: (payload.tags || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      total: payload.current_total_price ?? payload.total_price ?? null,
      currency: payload.currency || null,
      customer_email: payload.email || null,
      raw_json: payload
    }, { merge: true });

    // write line items (batch)
    if (Array.isArray(payload.line_items) && payload.line_items.length) {
      const batch = db.batch();
      for (const li of payload.line_items) {
        const liRef = orderRef.collection('line_items').doc(String(li.id));
        batch.set(liRef, {
          line_id: li.id,
          title: li.title,
          variant_title: li.variant_title,
          quantity: li.quantity,
          fulfillable_quantity: li.fulfillable_quantity ?? null,
          sku: li.sku ?? null,
          price: li.price ?? null
        }, { merge: true });
      }
      await batch.commit();
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('webhook error', e);
    return res.status(500).send('upsert fail');
  }
});

// GET /orders?shop=cropndtop.myshopify.com&limit=50
app.get('/orders', async (req: any, res: any) => {
  try {
    const shop = String(req.query.shop || 'cropndtop.myshopify.com');
    const limit = Math.min(Number(req.query.limit || 50), 200);

    const q = db.collection('orders')
                .where('shop_domain','==', shop)
                .orderBy('updated_at','desc')
                .limit(limit);

    const snap = await q.get();
    const items = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    return res.json({ ok: true, items, total: items.length });
  } catch (e) {
    console.error(e);
    res.status(500).send('failed');
  }
});

// GET /orders/:orderId/items
app.get('/orders/:orderId/items', async (req: any, res: any) => {
  try {
    const orderId = String(req.params.orderId);
    const snap = await db.collection('orders').doc(orderId).collection('line_items').orderBy('line_id').get();
    const items = snap.docs.map((d: any) => d.data());
    return res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).send('failed');
  }
});

// export as one function "api"
exports.api = functions.https.onRequest(app);
