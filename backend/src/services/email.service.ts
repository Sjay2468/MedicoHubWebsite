import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.EMAIL_FROM || 'Medico Hub <notifications@medicohub.com.ng>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'medicohub2024@gmail.com';

// --- DESIGN TOKENS ---
const COLORS = {
    bg: '#F1F5F9',
    card: '#ffffff',
    header: '#0F172A',
    primary: '#0066FF',
    text: '#334155',
    textLight: '#64748B',
    border: '#E2E8F0',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444'
};

const STYLES = {
    container: `max-width: 600px; margin: 40px auto; background: ${COLORS.card}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); font-family: 'Plus Jakarta Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;`,
    header: `background: ${COLORS.header}; padding: 32px 20px; text-align: center;`,
    logoText: `color: white; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;`,
    body: `padding: 40px 32px;`,
    h1: `color: ${COLORS.header}; margin: 0 0 16px 0; font-size: 24px; font-weight: 700; line-height: 1.3;`,
    p: `color: ${COLORS.text}; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;`,
    button: `display: inline-block; background: ${COLORS.primary}; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0, 102, 255, 0.2);`,
    footer: `background: #F8FAFC; padding: 24px; text-align: center; border-top: 1px solid ${COLORS.border};`,
    footerText: `color: ${COLORS.textLight}; font-size: 12px; margin: 4px 0;`
};

/**
 * Wraps content in the standardized Medico Hub Email Template
 */
const wrapEmail = (title: string, contentHtml: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.bg}; -webkit-font-smoothing: antialiased;">
    <div style="${STYLES.container}">
        <!-- Header -->
        <div style="${STYLES.header}">
             <h1 style="${STYLES.logoText}">MEDICO HUB</h1>
        </div>
        
        <!-- Content -->
        <div style="${STYLES.body}">
            ${contentHtml}
        </div>

        <!-- Footer -->
        <div style="${STYLES.footer}">
            <p style="${STYLES.footerText}">© ${new Date().getFullYear()} Medico Hub. All rights reserved.</p>
            <p style="${STYLES.footerText}">Empowering the next generation of medical excellence.</p>
            
            <div style="margin-top: 16px;">
                <a href="https://medicohub.com.ng" style="color: ${COLORS.primary}; text-decoration: none; font-size: 12px; margin: 0 8px;">Website</a>
                <a href="https://medicohub.com.ng/store" style="color: ${COLORS.primary}; text-decoration: none; font-size: 12px; margin: 0 8px;">Store</a>
                <a href="mailto:support@medicohub.com.ng" style="color: ${COLORS.primary}; text-decoration: none; font-size: 12px; margin: 0 8px;">Support</a>
            </div>
        </div>
    </div>
</body>
</html>
`;


export const EmailService = {

    /**
     * Welcome Email
     */
    sendWelcomeEmail: async (user: any) => {
        if (!resend || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_123') return;

        try {
            const firstName = user.name ? user.name.split(' ')[0] : 'Scholar';
            const content = `
                <h1 style="${STYLES.h1}">Welcome to the Family, ${firstName}! 🩺</h1>
                <p style="${STYLES.p}">
                    You have just joined a community of visionary medical students committed to excellence. 
                    <strong>Medico Hub</strong> is designed to be your ultimate companion—simplifying the complex 
                    and empowering you to achieve more with less stress.
                </p>
                
                <div style="background: #F0F9FF; border-left: 4px solid ${COLORS.primary}; padding: 24px; border-radius: 8px; margin: 24px 0;">
                    <p style="margin: 0 0 12px 0; color: ${COLORS.header}; font-weight: 700;">Your Arsenal for Success:</p>
                    <ul style="margin: 0; padding-left: 20px; color: ${COLORS.text}; font-size: 15px; line-height: 1.8;">
                        <li><strong>Smart Resources:</strong> High-yield notes and study aids.</li>
                        <li><strong>MCAMP Access:</strong> Elite mentorship and cohort challenges.</li>
                        <li><strong>Premium Store:</strong> Medical tools trusted by professionals.</li>
                    </ul>
                </div>

                <p style="${STYLES.p}">
                    We are honored to be part of your journey to becoming a physician. Let's make this semester your best one yet.
                </p>

                <div style="text-align: center; margin: 32px 0;">
                    <a href="https://medicohub.com.ng/login" style="${STYLES.button}">Login to Dashboard</a>
                </div>
            `;

            const response = await resend.emails.send({
                from: FROM_EMAIL,
                to: user.email,
                subject: 'Welcome to Medico Hub! 🚀',
                html: wrapEmail('Welcome', content)
            });

            if (response.error) throw response.error;
            console.log(`[EmailService] Welcome email sent to ${user.email}`);
        } catch (error) {
            console.error("[EmailService] Failed to send welcome email:", error);
        }
    },

    /**
     * MCAMP Welcome (Premium Styling)
     */
    sendMcampWelcomeEmail: async (user: any, uniqueId: string) => {
        if (!resend || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_123') return;

        try {
            const content = `
                <div style="text-align: center; margin-bottom: 24px;">
                    <span style="background: #FFDE00; color: #0F172A; padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Distinction Cohort</span>
                </div>
                
                <h1 style="${STYLES.h1}; text-align: center;">Welcome to the Inner Circle 🌟</h1>
                <p style="${STYLES.p}">
                    Congratulations, <strong>${user.name}</strong>. Acceptance into the <strong>Medical Mentorship Cohort (MCAMP)</strong> is a testament to your dedication.
                    You are now part of a select group of scholars committed not just to passing, but to setting the standard.
                </p>
                
                <div style="background: #0F172A; color: white; padding: 32px; border-radius: 16px; margin: 32px 0; text-align: center; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: linear-gradient(90deg, #FFDE00, #0066FF);"></div>
                    <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94A3B8; font-weight: 700;">Your Unique MCAMP ID</p>
                    <h2 style="margin: 16px 0; font-size: 36px; font-family: monospace; letter-spacing: 3px; color: #FFDE00;">${uniqueId}</h2>
                    <p style="margin: 0; font-size: 13px; color: #CBD5E1;">Required for community verification & exclusive events.</p>
                </div>

                <div style="text-align: center; margin-top: 32px;">
                    <a href="https://medicohub.com.ng/login" style="${STYLES.button}">Enter MCAMP Portal</a>
                </div>
            `;

            const response = await resend.emails.send({
                from: 'MCAMP Admissions <admissions@medicohub.com.ng>',
                to: user.email,
                subject: 'You are in! MCAMP Admission Confirmed 🎓',
                html: wrapEmail('MCAMP Access', content)
            });

            if (response.error) throw response.error;
            console.log(`[EmailService] MCAMP welcome sent to ${user.email}`);
        } catch (error) {
            console.error("[EmailService] Failed to send MCAMP welcome:", error);
        }
    },

    /**
     * Account Suspension / Unban Email
     */
    sendSuspensionEmail: async (user: any, isSuspended: boolean) => {
        if (!resend || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_123') return;

        try {
            const headline = isSuspended ? "Account Suspended 🛑" : "Account Restored ✅";
            const subject = isSuspended ? "Important: Your Account has been Suspended" : "Good News: Account Access Restored";
            const color = isSuspended ? COLORS.error : COLORS.success;

            const message = isSuspended
                ? "Your access to Medico Hub has been temporarily suspended due to a policy violation or security concern. Please contact support if you believe this is a mistake."
                : "We have reviewed your case and your access to Medico Hub has been fully restored. We apologize for the interruption.";

            const content = `
                <h1 style="${STYLES.h1}; color: ${color};">${headline}</h1>
                <p style="${STYLES.p}">${message}</p>
                
                ${!isSuspended ? `
                <div style="text-align: center; margin: 32px 0;">
                    <a href="https://medicohub.com.ng/login" style="${STYLES.button}">Log In Now</a>
                </div>` :
                    `
                <div style="background: #FEF2F2; border-left: 4px solid ${COLORS.error}; padding: 20px; border-radius: 8px; margin: 24px 0;">
                     <p style="margin: 0; color: ${COLORS.error}; font-weight: 600;">Contact Support</p>
                     <p style="margin: 8px 0 0 0; font-size: 14px; color: ${COLORS.textLight};">Reply to this email to appeal this decision.</p>
                </div>
                `}
            `;

            const response = await resend.emails.send({
                from: FROM_EMAIL,
                to: user.email,
                subject: subject,
                html: wrapEmail('Account Status', content)
            });

            if (response.error) throw response.error;
            console.log(`[EmailService] Suspension status(${isSuspended}) sent to ${user.email}`);
        } catch (error) {
            console.error("[EmailService] Failed to send suspension email:", error);
        }
    },

    /**
     * Pro Subscription Activated / Cancelled
     */
    sendSubscriptionStatusEmail: async (user: any, isPro: boolean) => {
        if (!resend || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_123') return;

        try {
            const headline = isPro ? "Pro Membership Activated 🚀" : "Pro Membership Ended";
            const subject = isPro ? "You are now a PRO Member!" : "Your Pro Subscription has ended";

            const content = isPro ? `
                <h1 style="${STYLES.h1}">Upgrade Complete! 🚀</h1>
                <p style="${STYLES.p}">
                    Thank you for upgrading to <strong>Medico Hub Pro</strong>. You now have unlimited access to our entire library of premium resources, study guides, and tools.
                </p>
                
                <div style="background: #F0F9FF; border-left: 4px solid ${COLORS.primary}; padding: 24px; border-radius: 8px; margin: 24px 0;">
                    <p style="margin: 0 0 12px 0; color: ${COLORS.header}; font-weight: 700;">Pro Benefits Unlocked:</p>
                    <ul style="margin: 0; padding-left: 20px; color: ${COLORS.text}; font-size: 15px; line-height: 1.8;">
                        <li>Unlimited Resource Downloads</li>
                        <li>Prioritized Support</li>
                        <li>Exclusive Content Access</li>
                    </ul>
                </div>

                <div style="text-align: center; margin: 32px 0;">
                    <a href="https://medicohub.com.ng/learning" style="${STYLES.button}">Explore Premium Content</a>
                </div>
            ` : `
                <h1 style="${STYLES.h1}">Pro Membership Ended</h1>
                <p style="${STYLES.p}">
                    Your Pro subscription has concluded. You still have access to all free resources and your account history.
                </p>
                <p style="${STYLES.p}">
                    Miss the premium features? You can reactivate your subscription at any time.
                </p>

                <div style="text-align: center; margin: 32px 0;">
                    <a href="https://medicohub.com.ng/pricing" style="${STYLES.button}">Renew Subscription</a>
                </div>
            `;

            const response = await resend.emails.send({
                from: FROM_EMAIL,
                to: user.email,
                subject: subject,
                html: wrapEmail('Subscription Status', content)
            });

            if (response.error) throw response.error;
            console.log(`[EmailService] Subscription status(${isPro}) sent to ${user.email}`);
        } catch (error) {
            console.error("[EmailService] Failed to send subscription email:", error);
        }
    },

    /**
     * Order Confirmation
     */
    sendOrderConfirmation: async (order: any) => {
        if (!resend || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_123') return;

        try {
            const itemsHtml = order.items.map((item: any) => `
                <tr>
                    <td style="padding: 16px 0; border-bottom: 1px solid #E2E8F0; color: ${COLORS.text}; font-weight: 500;">
                        ${item.name} <span style="color: ${COLORS.textLight}; font-weight: 400; font-size: 14px;">x${item.quantity}</span>
                    </td>
                    <td style="padding: 16px 0; border-bottom: 1px solid #E2E8F0; text-align: right; color: ${COLORS.header}; font-weight: 600;">
                        ₦${item.price.toLocaleString()}
                    </td>
                </tr>
            `).join('');

            const content = `
                <div style="text-align: center; margin-bottom: 32px;">
                    <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; background: #ECFDF5; border-radius: 50%; color: #10B981; font-size: 32px; margin-bottom: 16px;">✓</div>
                    <h1 style="${STYLES.h1}">Excellent Choice, Doctor in Training! 🩺</h1>
                    <p style="${STYLES.p}">
                        We’ve received your order. These aren't just material goods; they are investments in your professional future.
                        Our team is preparing your package.
                    </p>
                </div>

                <div style="background: #F8FAFC; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: ${COLORS.textLight}; font-size: 14px;">Order ID</span>
                        <span style="color: ${COLORS.header}; font-weight: 600; font-family: monospace;">#${order.orderId}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: ${COLORS.textLight}; font-size: 14px;">Date</span>
                        <span style="color: ${COLORS.header}; font-weight: 600;">${new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
                    ${itemsHtml}
                </table>

                <div style="border-top: 2px solid ${COLORS.border}; padding-top: 24px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                        <span style="color: ${COLORS.textLight};">Subtotal</span>
                        <span style="color: ${COLORS.header}; font-weight: 500;">₦${order.financials.subtotal.toLocaleString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                        <span style="color: ${COLORS.textLight};">Shipping</span>
                        <span style="color: ${COLORS.header}; font-weight: 500;">₦${order.financials.shippingFee.toLocaleString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 20px; font-size: 20px; color: ${COLORS.primary};">
                        <strong>Total Paid</strong>
                        <strong>₦${order.financials.total.toLocaleString()}</strong>
                    </div>
                </div>
            `;

            const response = await resend.emails.send({
                from: FROM_EMAIL,
                to: order.customer.email,
                subject: `Order Confirmed #${order.orderId}`,
                html: wrapEmail('Order Confirmed', content)
            });

            if (response.error) throw response.error;
            console.log(`[EmailService] Confirmation sent to ${order.customer.email}`);
        } catch (error) {
            console.error("[EmailService] Failed to send customer email:", error);
        }
    },

    /**
     * Admin Order Alert
     */
    sendAdminOrderAlert: async (order: any) => {
        if (!resend || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_123') return;

        try {
            const content = `
                <h1 style="${STYLES.h1}; color: ${COLORS.error};">🚨 New Order Alert</h1>
                <p style="${STYLES.p}">
                    <strong>Cha-ching!</strong> A new order has been placed on the store.
                </p>
                
                <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 20px; margin: 24px 0;">
                    <p style="margin: 0 0 8px 0;"><strong>Customer:</strong> ${order.customer.name}</p>
                    <p style="margin: 0 0 8px 0;"><strong>Total Value:</strong> <span style="font-size: 18px; color: ${COLORS.error}; font-weight: bold;">₦${order.financials.total.toLocaleString()}</span></p>
                    <p style="margin: 0;"><strong>Items:</strong> ${order.items.length} items</p>
                </div>

                <div style="text-align: center;">
                    <a href="${process.env.ADMIN_URL || 'https://admin.medicohub.com.ng'}/store" style="${STYLES.button}; background: ${COLORS.header};">View Order in Admin</a>
                </div>
            `;

            const response = await resend.emails.send({
                from: FROM_EMAIL,
                to: ADMIN_EMAIL,
                subject: `🚨 NEW ORDER: ₦${order.financials.total.toLocaleString()} - ${order.customer.name}`,
                html: wrapEmail('Admin Alert', content)
            });

            if (response.error) throw response.error;
            console.log(`[EmailService] Admin alert sent to ${ADMIN_EMAIL}`);
        } catch (error) {
            console.error("[EmailService] Failed to send admin alert:", error);
        }
    },

    /**
     * Order Status Update (Shipped, Delivered, Cancelled)
     */
    sendOrderStatusUpdate: async (order: any) => {
        if (!resend || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_123') return;

        let subject = "";
        let headline = "";
        let message = "";
        let statusColor = COLORS.primary;

        if (order.status === 'shipped') {
            subject = `Incoming! Your package is on the move 🚚`;
            headline = "Out for Delivery";
            message = "Good news! We've handed off your package to our logistics partners. It's making its way to you as we speak.";
        } else if (order.status === 'delivered') {
            subject = `Touchdown! Order Delivered 📦`;
            headline = "Successfully Delivered";
            message = "Your package has arrived! We hope these tools aid you in your pursuit of excellence.";
            statusColor = COLORS.success;
        } else if (order.status === 'cancelled') {
            subject = `Order Cancelled 🛑`;
            headline = "Order Cancelled";
            message = "Your order has been cancelled as per request or due to payment validation issues. A refund has been processed if applicable.";
            statusColor = COLORS.error;
        } else {
            return;
        }

        try {
            const content = `
                <h1 style="${STYLES.h1}">${headline}</h1>
                <p style="${STYLES.p}">Hi ${order.customer.name},</p>
                <p style="${STYLES.p}">${message}</p>
                
                <div style="background: #F8FAFC; border-left: 4px solid ${statusColor}; padding: 20px; border-radius: 8px; margin: 24px 0;">
                     <p style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: ${COLORS.textLight}; font-weight: 600;">Current Status</p>
                     <p style="margin: 8px 0 0 0; font-size: 24px; color: ${statusColor}; font-weight: 800; text-transform: uppercase;">${order.status}</p>
                </div>
            `;

            const response = await resend.emails.send({
                from: FROM_EMAIL,
                to: order.customer.email,
                subject: subject,
                html: wrapEmail(headline, content)
            });

            if (response.error) throw response.error;
            console.log(`[EmailService] Status update (${order.status}) sent to ${order.customer.email}`);
        } catch (error) {
            console.error("[EmailService] Failed to send status update email:", error);
        }
    },

    /**
     * Verification Email (Auth)
     */
    sendVerificationEmail: async (email: string, link: string) => {
        if (!resend || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_123') return;

        try {
            const content = `
                <h1 style="${STYLES.h1}">Verify Your Identity 🔐</h1>
                <p style="${STYLES.p}">
                    To ensure the security of your account and the integrity of the Medico Hub community, 
                    please confirm that this email address belongs to you.
                </p>
                
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${link}" style="${STYLES.button}">Verify Email Address</a>
                </div>
                
                <p style="${STYLES.p}; font-size: 14px; color: ${COLORS.textLight}; text-align: center;">
                    Or copy this secure link: <br/> 
                    <a href="${link}" style="color: ${COLORS.primary}; word-break: break-all;">${link}</a>
                </p>
            `;

            const response = await resend.emails.send({
                from: FROM_EMAIL,
                to: email,
                subject: 'Action Required: Verify Account',
                html: wrapEmail('Verify Email', content)
            });

            if (response.error) throw response.error;
            console.log(`[EmailService] Verification email sent to ${email}`);
        } catch (error) {
            console.error("[EmailService] Failed to send verification email:", error);
            throw error;
        }
    },

    /**
     * Password Reset Email (Auth)
     */
    sendPasswordResetEmail: async (email: string, link: string) => {
        if (!resend || !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_123') return;

        try {
            const content = `
                <h1 style="${STYLES.h1}">Security Alert: Password Reset 🔑</h1>
                <p style="${STYLES.p}">
                     We received a request to change the password for your Medico Hub account.
                     If this was you, you can securely set a new password below.
                </p>
                
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${link}" style="${STYLES.button}; background: ${COLORS.error};">Reset My Password</a>
                </div>
                
                <p style="${STYLES.p}; font-size: 14px; color: ${COLORS.textLight}; text-align: center;">
                    If you didn't initiate this request, please ignore this email. Your account remains secure.
                </p>
            `;

            const response = await resend.emails.send({
                from: FROM_EMAIL,
                to: email,
                subject: 'Reset Password Request',
                html: wrapEmail('Reset Password', content)
            });

            if (response.error) throw response.error;
            console.log(`[EmailService] Password reset email sent to ${email}`);
        } catch (error) {
            console.error("[EmailService] Failed to send password reset email:", error);
            throw error;
        }
    }
};
