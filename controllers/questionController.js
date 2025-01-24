import { plivoClient } from "../utils/plivoClient.js";

export const sendMessageOfCompletion = async ({
  countryCode,
  mobileNumber,
  name,
}) => {
  const URL_TO_REDIRECT_TO = `https://www.gotutorless.com/question-paper-list`;
  try {
    if (!mobileNumber || !countryCode) {
      console.error("Mobile number and country code are not present");
      return;
    }

    const response = await plivoClient.messages.create(
      process.env.PLIVO_PHONE_NUMBER,
      `${countryCode}${mobileNumber}`,
      `Hi, your Question Paper ${name} has been generated.
      You can check here ${URL_TO_REDIRECT_TO}.
      Thank you`
    );

    if (response) {
      console.log("Message sent succesfully");
    }
  } catch (error) {
    console.error("Error sending message:", error);
  }
};
