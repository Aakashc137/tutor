// snsRoutes.js

import express from "express";
import { Job } from "../models/job.js";
import axios from "axios";

const snsRouter = express.Router();

snsRouter.post("/notifications", async (req, res) => {
    try {
        console.log(`Received SNS notification`);
        const messageType = req.headers["x-amz-sns-message-type"];
        const message = req.body;

        if (messageType === "SubscriptionConfirmation") {
            console.log("Received SNS SubscriptionConfirmation:", message);
            console.log(JSON.stringify(message.SubscribeUrl, null, 2));
            // Automatically confirm the subscription by GET-ing the SubscribeURL
            await axios.get(message.SubscribeURL);
            console.log("Subscription confirmed");
            return res.json({ message: "Subscription confirmed" });
        } else if (messageType === "Notification") {
            // Parse the notification message (it is a JSON string in the Message field)
            const notification = JSON.parse(message.Message);
            const { JobId, Status } = notification;
            console.log(`Received notification for JobId ${JobId} with status ${Status}`);

            // Find the corresponding job by awsJobId and update its status
            const job = await Job.findOne({ where: { awsJobId: JobId } });
            if (job) {
                await job.update({ status: Status.toLowerCase() });
            }
            return res.json({ message: "Notification processed" });
        } else {
            console.log("Unhandled SNS message type:", messageType);
            return res.json({ message: "Message type not handled" });
        }
    } catch (error) {
        console.error("Error processing SNS notification:", error);
        return res.status(500).json({ message: "Error processing notification", error: error.message });
    }
});

export { snsRouter };