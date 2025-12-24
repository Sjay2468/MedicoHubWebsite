import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'medicohub2024@gmail.com';

export const EmailService = {
    /**
     * Sends a "Thank You" email to the customer after they buy something.
     */
    sendOrderConfirmation: async (order: any) => {
        // Stop if the API key is not set up correctly in the .env file.
        if (!resend || process.env.RESEND_API_KEY?.includes('re_123')) {
            console.warn("[EmailService] Resend API key missing. Skipping customer email.");
            return;
        }

        try {
            // Create a list of items for the email table.
            const itemsHtml = order.items.map((item: any) => `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name} x ${item.quantity}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₦${item.price.toLocaleString()}</td>
                </tr>
            `).join('');

            // Send the actual email using Resend.
            await resend.emails.send({
                from: FROM_EMAIL,
                to: order.customer.email,
                subject: `Order Confirmed - ${order.orderId}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                        <h1 style="color: #155e75; margin-bottom: 8px;">Order Confirmed!</h1>
                        <p style="color: #64748b;">Hi ${order.customer.name}, thank you for shopping with Medico Hub. We've received your order and are processing it.</p>
                        
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="margin: 0; color: #1e293b;">Order Details</h3>
                            <p style="margin: 5px 0; font-size: 14px; color: #64748b;">ID: <strong>${order.orderId}</strong></p>
                            <p style="margin: 5px 0; font-size: 14px; color: #64748b;">Date: ${new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>

                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f1f5f9;">
                                    <th style="padding: 10px; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase;">Item</th>
                                    <th style="padding: 10px; text-align: right; font-size: 12px; color: #475569; text-transform: uppercase;">Price</th>
                                </tr>
                            </thead>
                            <tbody>${itemsHtml}</tbody>
                        </table>

                        <div style="margin-top: 20px; border-top: 2px solid #f1f5f9; padding-top: 20px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="color: #64748b;">Subtotal:</span>
                                <span style="font-weight: bold;">₦${order.financials.subtotal.toLocaleString()}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="color: #64748b;">Shipping:</span>
                                <span style="font-weight: bold;">₦${order.financials.shippingFee.toLocaleString()}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-top: 12px; font-size: 18px; color: #155e75;">
                                <strong>Total Paid:</strong>
                                <strong>₦${order.financials.total.toLocaleString()}</strong>
                            </div>
                        </div>

                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #94a3b8; font-size: 12px;">
                            <p>Medico Hub - Premium Academic Tools for Medical Students</p>
                        </div>
                    </div>
                `
            });
            console.log(`[EmailService] Confirmation sent to ${order.customer.email}`);
        } catch (error) {
            console.error("[EmailService] Failed to send customer email:", error);
        }
    },

    /**
     * Sends a private alert to the Store Owner whenever a new order comes in.
     */
    sendAdminOrderAlert: async (order: any) => {
        if (!resend || process.env.RESEND_API_KEY?.includes('re_123')) return;

        try {
            await resend.emails.send({
                from: FROM_EMAIL,
                to: ADMIN_EMAIL,
                subject: `🚨 NEW ORDER RECEIVED - ${order.orderId}`,
                html: `
                    <div style="font-family: sans-serif; padding: 20px;">
                        <h2 style="color: #dc2626;">New Order Alert</h2>
                        <p>Customer: <strong>${order.customer.name}</strong> (${order.customer.email})</p>
                        <p>Phone: ${order.customer.phone}</p>
                        <p>Total: <strong>₦${order.financials.total.toLocaleString()}</strong></p>
                        <br/>
                        <a href="${process.env.ADMIN_URL || 'http://localhost:5173'}/store" 
                           style="background: #155e75; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                           View in Admin Panel
                        </a>
                    </div>
                `
            });
            console.log(`[EmailService] Admin alert sent to ${ADMIN_EMAIL}`);
        } catch (error) {
            console.error("[EmailService] Failed to send admin alert:", error);
        }
    },

    /**
     * Automatically tells the customer when their order is officially "On the way" or "Delivered".
     */
    sendOrderStatusUpdate: async (order: any) => {
        if (!resend || process.env.RESEND_API_KEY?.includes('re_123')) return;

        let subject = "";
        let headline = "";
        let message = "";

        // Customize the message based on the status.
        if (order.status === 'shipped') {
            subject = `Your order is on its way! - ${order.orderId}`;
            headline = "Out for Delivery";
            message = "Great news! Your order has been shipped and is on its way to you. Keep an eye out for it!";
        } else if (order.status === 'delivered') {
            subject = `Order Delivered! - ${order.orderId}`;
            headline = "Successfully Delivered";
            message = "Your order has been marked as delivered. We hope you enjoy your new medical kit and tools!";
        } else {
            return; // We don't send emails for generic statuses like 'pending'.
        }

        try {
            await resend.emails.send({
                from: FROM_EMAIL,
                to: order.customer.email,
                subject: subject,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                        <h1 style="color: #155e75; margin-bottom: 8px;">${headline}!</h1>
                        <p style="color: #64748b;">Hi ${order.customer.name}, ${message}</p>
                        
                        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 5px 0; font-size: 14px; color: #64748b;">Order ID: <strong>${order.orderId}</strong></p>
                            <p style="margin: 5px 0; font-size: 14px; color: #64748b;">Status: <span style="text-transform: uppercase; font-weight: bold; color: #155e75;">${order.status}</span></p>
                        </div>

                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #94a3b8; font-size: 12px;">
                            <p>Medico Hub - Premium Academic Tools for Medical Students</p>
                            <p>If you have any questions, reply to this email.</p>
                        </div>
                    </div>
                `
            });
            console.log(`[EmailService] Status update (${order.status}) sent to ${order.customer.email}`);
        } catch (error) {
            console.error("[EmailService] Failed to send status update email:", error);
        }
    }
};
