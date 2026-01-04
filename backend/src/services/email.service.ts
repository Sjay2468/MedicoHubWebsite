import { Resend } from 'resend';

// Use lazy initialization to ensure env vars are loaded
let _resend: Resend | null = null;
const getResend = () => {
    const key = process.env.RESEND_API_KEY;
    if (!_resend && key && key !== 're_123') {
        _resend = new Resend(key);
    }
    return _resend;
};

const FROM_EMAIL = process.env.EMAIL_FROM || 'Medico Hub <notifications@medicohub.com.ng>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'medicohub2024@gmail.com';

export const EmailService = {
    /**
     * Sends a welcome email to a new student.
     */
    sendWelcomeEmail: async (user: any) => {
        const resend = getResend();
        console.log(`[EmailService] sendWelcomeEmail called for ${user?.email}`);

        if (!resend) {
            console.error("[EmailService] Aborting sendWelcomeEmail: Resend client not initialized (Key missing or invalid)");
            return;
        }

        try {
            const { data, error } = await resend.emails.send({
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

            if (error) {
                console.error("[EmailService] Welcome Email API Error:", error);
            } else {
                console.log(`[EmailService] Welcome email sent successfully (ID: ${data?.id})`);
            }
        } catch (error) {
            console.error("[EmailService] Unexpected Error in sendWelcomeEmail:", error);
        }
    },

    /**
     * Sends a specialized welcome email for MCAMP cohort enrollment.
     */
    sendMcampWelcomeEmail: async (user: any, uniqueId: string) => {
        const resend = getResend();
        console.log(`[EmailService] sendMcampWelcomeEmail called for ${user?.email}`);
        if (!resend) {
            console.error("[EmailService] Aborting sendMcampWelcomeEmail: Resend client not initialized");
            return;
        }

        try {
            const { data, error } = await resend.emails.send({
                from: 'MCAMP Admissions <admissions@medicohub.com.ng>',
                to: user.email,
                subject: 'Congratulations! You are officially an MCAMP Member 🎓',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #fafafa;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <span style="background: #fbbf24; color: #000; padding: 5px 15px; border-radius: 20px; font-size: 10px; font-weight: 900; text-transform: uppercase;">Distinction Cohort</span>
                        </div>
                        <h2 style="color: #1e293b; text-align: center;">Admission Confirmed</h2>
                        
                        <div style="background: #ffffff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; margin: 20px 0; text-align: center;">
                            <p style="margin: 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; font-weight: bold;">Your MCAMP ID</p>
                            <h2 style="margin: 10px 0; font-size: 28px; color: #155e75; letter-spacing: 2px;">${uniqueId}</h2>
                        </div>

                        <p style="color: #475569; font-size: 14px; text-align: center;">Join the community using the link on your dashboard to start your daily mentorship module.</p>

                        <div style="text-align: center; margin-top: 25px;">
                            <a href="https://medicohub.com.ng/mcamp" style="background: #000; color: white; padding: 12px 25px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">Access MCAMP</a>
                        </div>
                    </div>
                `
            });

            if (error) {
                console.error("[EmailService] MCAMP Email API Error:", error);
            } else {
                console.log(`[EmailService] MCAMP email sent successfully (ID: ${data?.id})`);
            }
        } catch (error) {
            console.error("[EmailService] Unexpected Error in sendMcampWelcomeEmail:", error);
        }
    },

    /**
     * Sends a "Thank You" email to the customer after they buy something.
     */
    sendOrderConfirmation: async (order: any) => {
        const resend = getResend();
        console.log(`[EmailService] sendOrderConfirmation called for ${order?.customer?.email} (Order: ${order?.orderId})`);
        if (!resend) {
            console.error("[EmailService] Aborting sendOrderConfirmation: Resend client not initialized");
            return;
        }

        try {
            const itemsHtml = order.items.map((item: any) => `
                <tr>
                    <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name} x ${item.quantity}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₦${item.price.toLocaleString()}</td>
                </tr>
            `).join('');

            const { data, error } = await resend.emails.send({
                from: FROM_EMAIL,
                to: order.customer.email,
                subject: `Order Confirmation #${order.orderId} - Medico Hub 🛒`,
                html: `
                    <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                        <div style="background: #155e75; color: white; padding: 25px; text-align: center;">
                            <h2 style="margin: 0;">Order Confirmed!</h2>
                            <p style="margin: 5px 0 0 0; opacity: 0.8;">Order #${order.orderId}</p>
                        </div>
                        <div style="padding: 25px;">
                            <p>Good news! Your order is being processed.</p>
                            <table style="width: 100%; border-collapse: collapse;">
                                ${itemsHtml}
                                <tr>
                                    <td style="padding: 10px; font-weight: bold;">Total</td>
                                    <td style="padding: 10px; text-align: right; font-weight: bold;">₦${order.totalAmount.toLocaleString()}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                `
            });

            if (error) {
                console.error("[EmailService] Order Email API Error:", error);
            } else {
                console.log(`[EmailService] Order confirmation sent (ID: ${data?.id})`);
            }
        } catch (error) {
            console.error("[EmailService] Unexpected Error in sendOrderConfirmation:", error);
        }
    },

    /**
     * Sends a private alert to the Store Owner whenever a new order comes in.
     */
    sendAdminOrderAlert: async (order: any) => {
        const resend = getResend();
        console.log(`[EmailService] sendAdminOrderAlert called for Order: ${order?.orderId}`);
        if (!resend) return;

        try {
            const { data, error } = await resend.emails.send({
                from: 'Medico Store <notifications@medicohub.com.ng>',
                to: ADMIN_EMAIL,
                subject: `New Order Received! #${order.orderId} 🚨`,
                html: `<h1>New Order Received!</h1><p>Customer: ${order.customer.name} (${order.customer.email})</p><p>Amount: ₦${order.totalAmount.toLocaleString()}</p>`
            });
            if (error) console.error("[EmailService] Admin Alert API Error:", error);
        } catch (error) {
            console.error("[EmailService] Unexpected Error in sendAdminOrderAlert:", error);
        }
    },

    /**
     * Automatically tells the customer when their order is officially "On the way" or "Delivered".
     */
    sendOrderStatusUpdate: async (order: any) => {
        const resend = getResend();
        console.log(`[EmailService] sendOrderStatusUpdate called for ${order?.customer?.email} - Status: ${order?.status}`);
        if (!resend) return;

        let subject = `Update on Order #${order.orderId}`;
        let headline = `Order Status: ${order.status.toUpperCase()}`;

        try {
            const { data, error } = await resend.emails.send({
                from: FROM_EMAIL,
                to: order.customer.email,
                subject: `${subject} - Medico Hub 📦`,
                html: `<h1>${headline}</h1><p>Your order #${order.orderId} is now ${order.status}.</p>`
            });
            if (error) console.error("[EmailService] Status Update API Error:", error);
        } catch (error) {
            console.error("[EmailService] Unexpected Error in sendOrderStatusUpdate:", error);
        }
    },

    /**
     * Sends a custom password reset email using a Resend template.
     */
    sendPasswordResetEmail: async (email: string, resetLink: string) => {
        const resend = getResend();
        console.log(`[EmailService] sendPasswordResetEmail called for ${email}`);
        if (!resend) return;

        try {
            const { data, error } = await resend.emails.send({
                from: FROM_EMAIL,
                to: email,
                subject: 'Reset Your Medico Hub Password 🔐',
                html: `<h1>Password Reset</h1><a href="${resetLink}">Reset Password</a>`
            });
            if (error) console.error("[EmailService] Password Reset API Error:", error);
        } catch (error) {
            console.error("[EmailService] Unexpected Error in sendPasswordResetEmail:", error);
        }
    },

    /**
     * Sends a custom email verification link.
     */
    sendVerificationEmail: async (email: string, verifyLink: string) => {
        const resend = getResend();
        console.log(`[EmailService] sendVerificationEmail called for ${email}`);
        if (!resend) return;

        try {
            const { data, error } = await resend.emails.send({
                from: FROM_EMAIL,
                to: email,
                subject: 'Verify Your Email - Medico Hub ✅',
                html: `<h1>Verify Email</h1><a href="${verifyLink}">Verify Now</a>`
            });
            if (error) console.error("[EmailService] Verification Email API Error:", error);
            else console.log(`[EmailService] Verification sent (ID: ${data?.id})`);
        } catch (error) {
            console.error("[EmailService] Unexpected Error in sendVerificationEmail:", error);
        }
    }
};
