import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './configs/db.js';
import { clerkMiddleware } from '@clerk/express'
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js"
import clerkWebhookRouter from './routes/clerkWebhook.js';


const app = express();
const port = 3000;
await connectDB();

app.use(cors())

// ⚠️ Webhook route SABSE PEHLE, express.json() se pehle:
app.use('/api/webhooks/clerk', clerkWebhookRouter);

// Ab baaki sab routes ke liye JSON parsing:
app.use(express.json());
app.use(clerkMiddleware())

// API Routes
app.get('/' , (req, res) => {
    res.send("Server is Live ! ")
})
app.use('/api/inngest', serve({client: inngest, functions}))

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
})