
import { Resend } from 'resend';

// Mock the behavior of EmailService with the new refactor pattern
const runTest = async () => {
    console.log("Testing Refactored Logic with Invalid Key...");

    // 1. Simulate the Resend Client
    const resend = new Resend('re_123_INVALID_KEY');

    try {
        // 2. Perform the call (simulating EmailService.sendXYZ)
        // @ts-ignore
        const response = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'delivered@resend.dev',
            subject: 'Test Email',
            html: '<strong>Test</strong>',
        });

        // 3. The new Logic we just added:
        if (response.error) {
            console.log(">> DETECTED ERROR OBJECT (Success! Code would throw here)");
            throw response.error;
        }

        console.log(">> NO ERROR DETECTED (Unexpected for invalid key)");
    } catch (error) {
        console.log(">> CATCH BLOCK REACHED (Success! Error was thrown and caught)");
        console.log("Error details:", error);
    }
};

runTest();
