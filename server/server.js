import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './configs/mongodb.js';
import { clerkWebhooks, stripeWebhooks } from './controllers/webhooks.js';
import educatorRouter from './routes/educatorRoutes.js';
import { clerkMiddleware } from '@clerk/express';
import connectCloudinary from './configs/cloudinary.js';
import courseRouter from './routes/courseRoutes.js';
import userRouter from './routes/userRoutes.js';

// Initialise Express
const app = express();

// Connect to database
await connectDB();
await connectCloudinary();

// --- IMPORTANT CHANGES START HERE ---

// 1. Define the webhook route FIRST, using a raw body parser.
// This ensures the raw body is available for signature verification.
app.post('/clerk', express.raw({ type: 'application/json' }), clerkWebhooks);

// 2. Now, use the standard middleware for all OTHER routes.
app.use(cors());
app.use(express.json());
app.use(clerkMiddleware())





// Other Routes
app.get('/', (req, res) => res.send("API Working"));
app.use('/api/educator', express.json(), educatorRouter)
app.use('/api/course', express.json(), courseRouter)
app.use('/api/user', express.json(), userRouter)
app.post('/stripe', express.raw({type: 'application/json'}), stripeWebhooks)


// Port
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));