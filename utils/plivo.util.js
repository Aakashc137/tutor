import { plivoClient } from "./plivoClient.js";

export const sendTextMessage = async ({
    countryCode,
    mobileNumber,
    message,
}) => {
    try {
        if (!mobileNumber || !countryCode) {
            console.error("Mobile number and country code are not present");
            return;
        }

        const response = await plivoClient.messages.create(
            process.env.PLIVO_PHONE_NUMBER,
            `${countryCode}${mobileNumber}`,
            message
        );

        console.log(`Message sent successfully: ${response.messageUuid}`);
    } catch (error) {
        console.error("Error sending message:", error);
    }
};