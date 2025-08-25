import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './configs/mongodb.js';
import { clerkWebhooks } from './controllers/webhooks.js';

// Initialise Express
const app = express();

// Connect to database
await connectDB();

// --- IMPORTANT CHANGES START HERE ---

// 1. Define the webhook route FIRST, using a raw body parser.
// This ensures the raw body is available for signature verification.
app.post('/clerk', express.raw({ type: 'application/json' }), clerkWebhooks);

// 2. Now, use the standard middleware for all OTHER routes.
app.use(cors());
app.use(express.json()); // This will parse JSON for any route that comes after it.

// --- CHANGES END HERE ---


// Other Routes
app.get('/', (req, res) => res.send("API Working"));
// app.use('/api/users', userRoutes); // Example of other routes


// Port
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));