import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.EMAIL_FROM || 'Medico Hub <notifications@medicohub.com.ng>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'medicohub2024@gmail.com';

export const EmailService = {
    /**
     * Sends a welcome email to a new student.
     */
    sendWelcomeEmail: async (user: any) => {
        if (!resend || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_123') return;

        try {
            `
            });
            
            if (response.error) {
                throw response.error;
            }
            console.log(`[EmailService] Welcome email sent to ${ user.email } `);
        } catch (error) {
            console.error("[EmailService] Failed to send welcome email:", error);
        }
    },

    /**
     * Sends a specialized welcome email for MCAMP cohort enrollment.
     */
    sendMcampWelcomeEmail: async (user: any, uniqueId: string) => {
        if (!resend || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_123') return;

        try {
                `
        });

        if (response.error) {
            throw response.error;
        }
        console.log(`[EmailService] MCAMP welcome sent to ${user.email}`);
    } catch(error) {
        console.error("[EmailService] Failed to send MCAMP welcome:", error);
    }
},

    /**
     * Sends a "Thank You" email to the customer after they buy something.
     */
    sendOrderConfirmation: async (order: any) => {
        if (!resend || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_123') return;

        try {
            const itemsHtml = order.items.map((item: any) => `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name} x ${item.quantity}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₦${item.price.toLocaleString()}</td>
                </tr>
            `).join('');

            `
            });

            if (response.error) {
                throw response.error;
            }
            console.log(`[EmailService] Confirmation sent to ${ order.customer.email } `);
        } catch (error) {
            console.error("[EmailService] Failed to send customer email:", error);
        }
    },

    /**
     * Sends a private alert to the Store Owner whenever a new order comes in.
     */
    sendAdminOrderAlert: async (order: any) => {
        if (!resend || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_123') return;

        try {
                `
        });

        if (response.error) {
            throw response.error;
        }
        console.log(`[EmailService] Admin alert sent to ${ADMIN_EMAIL}`);
        console.log(`[EmailService] Admin alert sent to ${ADMIN_EMAIL}`);
    } catch (error) {
        console.error("[EmailService] Failed to send admin alert:", error);
    }
    },

/**
 * Automatically tells the customer when their order is officially "On the way" or "Delivered".
 */
sendOrderStatusUpdate: async (order: any) => {
    if (!resend || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_123') return;

    let subject = "";
    let headline = "";
    let message = "";

    if (order.status === 'shipped') {
        subject = `Your order is on its way! - ${order.orderId}`;
        headline = "Out for Delivery";
        message = "Great news! Your order has been shipped and is on its way to you. Keep an eye out for it!";
    } else if (order.status === 'delivered') {
        subject = `Order Delivered! - ${order.orderId}`;
        headline = "Successfully Delivered";
        message = "Your order has been marked as delivered. We hope you enjoy your new medical kit and tools!";
    } else {
        return;
    }

    try {
        `
            });

            if (response.error) {
                throw response.error;
            }
            console.log(`[EmailService] Status update(${ order.status }) sent to ${ order.customer.email } `);
        } catch (error) {
            console.error("[EmailService] Failed to send status update email:", error);
        }
    }
};
