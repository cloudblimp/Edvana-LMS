import { Webhook, WebhookVerificationError } from "svix";
import User from "../models/User.js";
import Stripe from "stripe";
import { Purchase } from "../models/Purchase.js";
import Course from "../models/Course.js";

// API Controller function to manage Clerk User with database
export const clerkWebhooks = async (req, res) => {
    try {
        // Get the headers and body
        const headers = req.headers;
        // The body is now a raw buffer, so we use `req.body` directly
        const payload = req.body;

        // Get the Svix headers for verification
        const svix_id = headers["svix-id"];
        const svix_timestamp = headers["svix-timestamp"];
        const svix_signature = headers["svix-signature"];

        // If there are no Svix headers, error out
        if (!svix_id || !svix_timestamp || !svix_signature) {
            return res.status(400).json({
                success: false,
                message: "Error occurred -- no svix headers",
            });
        }

        // Create a new Svix instance with your secret.
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

        let evt;

        // Verify the payload with the headers
        try {
            // The `verify` function will throw an error if the signature is not valid
            evt = whook.verify(payload, {
                "svix-id": svix_id,
                "svix-timestamp": svix_timestamp,
                "svix-signature": svix_signature,
            });
        } catch (err) {
            console.error('Error verifying webhook:', err.message);
            return res.status(400).json({
                success: false,
                message: err.message,
            });
        }

        // Get the event type and data
        const { id, ...attributes } = evt.data;
        const eventType = evt.type;

        switch (eventType) {
            case 'user.created': {
                const userData = {
                    _id: id, // Use the destructured 'id'
                    email: attributes.email_addresses[0].email_address, // CORRECTED: email_addresses
                    name: `${attributes.first_name || ''} ${attributes.last_name || ''}`.trim(),
                    imageUrl: attributes.image_url,
                };
                await User.create(userData);
                return res.status(201).json({ success: true, message: 'User created.' });
            }
            case 'user.updated': {
                const userData = {
                    email: attributes.email_addresses[0].email_address,
                    name: `${attributes.first_name || ''} ${attributes.last_name || ''}`.trim(),
                    imageUrl: attributes.image_url,
                };
                await User.findByIdAndUpdate(id, userData);
                return res.status(200).json({ success: true, message: 'User updated.' });
            }
            case 'user.deleted': {
                // For deleted users, Clerk might send a minimal payload
                await User.findByIdAndDelete(id);
                return res.status(200).json({ success: true, message: 'User deleted.' });
            }
            default: {
                // Acknowledge other events so Clerk doesn't retry
                console.log(`Received unhandled event type: ${eventType}`);
                return res.status(200).json({ success: true, message: 'Event received.' });
            }
        }
    } catch (error) {
        console.error("Error processing webhook:", error);
        // Don't leak implementation details in the response
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)
export const stripeWebhooks = async (request, response) => {
    const sig = request.headers['stripe-signature'];
    let event;
    try {
        event = Stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        response.status(400).send(`Webhook Error: ${err.message}`);
    }
    switch (event.type) {
        case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object;
            const paymentIntentId = paymentIntent.id;
            const session = await stripeInstance.checkout.sessions.list({
                payment_intent: paymentIntentId
            })
            const { purchaseId } = session.data[0].metadata;
            const purchaseData = await Purchase.findById(purchaseId)
            const userData = await User.findById(purchaseData.userId)
            const courseData = await Course.findById(purchaseData.courseId.toString())
            courseData.enrolledStudents.push(userData)
            await courseData.save()
            userData.enrolledCourses.push(courseData._id)
            await userData.save()

            purchaseData.status = 'completed'
            await purchaseData.save()

            break;
        }
        case 'payment_intent.payment_failed': {
            const paymentIntent = event.data.object;
            const paymentIntentId = paymentIntent.id;
            const session = await stripeInstance.checkout.sessions.list({
                payment_intent: paymentIntentId
            })
            const { purchaseId } = session.data[0].metadata;
            const purchaseData = await Purchase.findById(purchaseId)
            purchaseData.status = 'failed'
            await purchaseData.save()
            break;
        }
        // ... handle other event types
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    response.json({ received: true });
}