import { Webhook, WebhookVerificationError } from "svix";
import User from "../models/User.js";

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