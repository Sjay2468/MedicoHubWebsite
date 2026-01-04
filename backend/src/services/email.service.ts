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
            await resend.emails.send({
                from: FROM_EMAIL,
                to: user.email,
                subject: 'Welcome to Medico Hub! 🩺',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                        <h1 style="color: #155e75; margin-bottom: 8px;">Welcome, Hero!</h1>
                        <p style="color: #64748b;">Hi ${user.name || user.email.split('@')[0]}, we're thrilled to have you join our community of medical students striving for excellence.</p>
                        
                        <p style="color: #64748b;">Medico Hub is designed to simplify your academic journey with premium tools, resources, and a supportive community.</p>

                        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #155e75;">
                            <h3 style="margin: 0 0 10px 0; color: #1e293b;">Next Steps:</h3>
                            <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.6;">
                                <li>Complete your profile setup.</li>
                                <li>Explore the Learning Library.</li>
                                <li>Check out our Medical Kits in the Store.</li>
                            </ul>
                        </div>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://medicohub.com.ng/dashboard" 
                               style="background: #155e75; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">
                               Go to Dashboard
                            </a>
                        </div>

                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #94a3b8; font-size: 12px;">
                            <p>Medico Hub - Empowering the Next Generation of Medics</p>
                        </div>
                    </div>
                `
            });
            console.log(`[EmailService] Welcome email sent to ${user.email}`);
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
            await resend.emails.send({
                from: 'MCAMP Admissions <admissions@medicohub.com.ng>',
                to: user.email,
                subject: 'Congratulations! You are officially an MCAMP Member 🎓',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fafafa;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <span style="background: #fbbf24; color: #000; padding: 5px 15px; rounded-full; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; border-radius: 20px;">Distinction Cohort</span>
                        </div>
                        <h1 style="color: #1e293b; text-align: center; margin-bottom: 8px;">Admission Confirmed</h1>
                        <p style="color: #64748b; text-align: center;">Welcome to the Medical Mentorship Cohort (MCAMP). You've taken a significant step towards academic excellence.</p>
                        
                        <div style="background: #ffffff; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; margin: 25px 0; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                            <p style="margin: 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: bold;">Your Unique MCAMP ID</p>
                            <h2 style="margin: 10px 0; font-size: 32px; color: #155e75; font-family: monospace; letter-spacing: 2px;">${uniqueId}</h2>
                            <p style="margin: 0; font-size: 14px; color: #64748b;">Keep this ID safe. You'll need it for community verification and leaderboard tracking.</p>
                        </div>

                        <div style="margin: 25px 0;">
                            <h3 style="color: #1e293b; font-size: 16px;">What's next?</h3>
                            <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
                                <div style="background: #155e75; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 12px; flex-shrink: 0;">1</div>
                                <p style="margin: 0; font-size: 14px; color: #475569;">Join the WhatsApp Community using the link on your dashboard.</p>
                            </div>
                            <div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
                                <div style="background: #155e75; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 12px; flex-shrink: 0;">2</div>
                                <p style="margin: 0; font-size: 14px; color: #475569;">Complete your first Daily Module based on your set start date.</p>
                            </div>
                        </div>

                        <div style="text-align: center; margin-top: 30px;">
                            <a href="https://medicohub.com.ng/mcamp" 
                               style="background: #000000; color: white; padding: 14px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">
                               Access MCAMP Dashboard
                            </a>
                        </div>

                        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #94a3b8; font-size: 12px;">
                            <p>This email was sent to ${user.email} regarding your enrollment in the Medico Hub Mentorship Program.</p>
                        </div>
                    </div>
                `
            });
            console.log(`[EmailService] MCAMP welcome sent to ${user.email}`);
        } catch (error) {
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
        if (!resend || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_123') return;

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
    },
    /**
     * Sends a custom password reset email using a Resend template.
     */
    sendPasswordResetEmail: async (email: string, resetLink: string) => {
        if (!resend || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_123') return;

        try {
            await resend.emails.send({
                from: FROM_EMAIL,
                to: email,
                subject: 'Reset Your Medico Hub Password 🔐',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                        <h2 style="color: #155e75;">Password Reset Request</h2>
                        <p style="color: #64748b;">Hi, we received a request to reset your password for your Medico Hub account. Click the button below to choose a new one:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" 
                               style="background: #155e75; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">
                               Reset Password
                            </a>
                        </div>

                        <p style="color: #94a3b8; font-size: 12px;">If you didn't request this, you can safely ignore this email. This link will expire shortly.</p>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #94a3b8; font-size: 12px;">
                            <p>Medico Hub - Empowering the Next Generation of Medics</p>
                        </div>
                    </div>
                `
            });
            console.log(`[EmailService] Password reset sent to ${email}`);
        } catch (error) {
            console.error("[EmailService] Failed to send password reset:", error);
        }
    },

    /**
     * Sends a custom email verification link.
     */
    sendVerificationEmail: async (email: string, verifyLink: string) => {
        if (!resend || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_123') return;

        try {
            await resend.emails.send({
                from: FROM_EMAIL,
                to: email,
                subject: 'Verify your Medico Hub Account 📧',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                        <h2 style="color: #155e75;">Verify Your Email</h2>
                        <p style="color: #64748b;">Thanks for joining Medico Hub! Please verify your email address to get full access to your account:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verifyLink}" 
                               style="background: #155e75; color: white; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">
                               Verify Email Address
                            </a>
                        </div>

                        <p style="color: #94a3b8; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #94a3b8; font-size: 12px;">
                            <p>Medico Hub - Empowering the Next Generation of Medics</p>
                        </div>
                    </div>
                `
            });
            console.log(`[EmailService] Verification email sent to ${email}`);
        } catch (error) {
            console.error("[EmailService] Failed to send verification email:", error);
        }
    }
};
