// routes/clerkWebhook.js
import express from 'express';
import { Webhook } from 'svix';
import { inngest } from '../inngest/index.js';

const router = express.Router();

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  const svix_id = req.headers['svix-id'];
  const svix_timestamp = req.headers['svix-timestamp'];
  const svix_signature = req.headers['svix-signature'];

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;

  try {
    evt = wh.verify(req.body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    });
  } catch (err) {
    console.error('Webhook verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Verified! Ab Inngest ko event bhejo
  await inngest.send({
    name: `clerk/${evt.type}`, // e.g. clerk/user.created
    data: evt.data,
  });

  console.log('Clerk event forwarded to Inngest:', evt.type);
  res.status(200).json({ received: true });
});

export default router;