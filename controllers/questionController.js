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
      `${name} question paper was generated successfully.
      You can check the generated question paper here: ${URL_TO_REDIRECT_TO}.
      Thank you`
    );

    if (response) {
      console.log("Message sent succesfully");
    }
  } catch (error) {
    console.error("Error sending message:", error);
  }
};

export const sendMessageOfFailure = async ({
  countryCode,
  mobileNumber,
  name,
}) => {
  try {
    if (!mobileNumber || !countryCode) {
      console.error("Mobile number and country code are not present");
      return;
    }

    const response = await plivoClient.messages.create(
      process.env.PLIVO_PHONE_NUMBER,
      `${countryCode}${mobileNumber}`,
      `${name} question paper FAILED to generate.
      This might happen due to some technical issue at our end. We apologize for the inconvenience caused.
      You can retry generating the question paper.
      If the problem persists, please reach out to our support team.`
    );

    if (response) {
      console.log("Message sent succesfully");
    }
  } catch (error) {
    console.error("Error sending message:", error);
  }
};
