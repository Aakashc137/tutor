// snsRoutes.js

import express from "express";
import { Job } from "../models/job.js";
import axios from "axios";
import s3 from "../utils/s3.js";
import { textract } from "./extractRoutes.js";
import { questionPaperController } from "../controllers/paperController.js";

const snsRouter = express.Router();

snsRouter.post("/notifications", async (req, res) => {
    try {
        console.log(`Received SNS notification`);
        const messageType = req.headers["x-amz-sns-message-type"];
        const messageString = req.body;

        if (messageType === "Notification") {
            // Parse the notification message (it is a JSON string in the Message field)
            console.log(`Received SNS notification of type ${messageType}: ${messageString}`);
            const message = JSON.parse(messageString);
            console.log(`Parsed Message: ${message.Message}`);
            const notification = JSON.parse(message.Message);
            const { JobId: awsJobId, Status: awsJobStatus } = notification;
            console.log(`Received notification for JobId ${awsJobId} with status ${awsJobStatus}`);

            const job = await Job.findOne({ where: { awsJobId } });
            if (awsJobStatus === "FAILED") {
                if (job) {
                    await job.update({ status: "failed" });
                }
                return res.status(200).send();
            }

            // Otherwise, we do getDocumentTextDetection calls
            let allBlocks = [];
            let nextToken = null;
            let params = { JobId: job.awsJobId };

            const initialData = await textract.getDocumentTextDetection(params).promise();
            if (initialData.Blocks) {
                allBlocks.push(...initialData.Blocks);
            }
            nextToken = initialData.NextToken;

            // Keep fetching until NextToken is empty
            while (nextToken) {
                params.NextToken = nextToken;
                const nextData = await textract.getDocumentTextDetection(params).promise();
                if (nextData.Blocks) {
                    allBlocks.push(...nextData.Blocks);
                }
                nextToken = nextData.NextToken;
            }

            // Check final JobStatus
            const finalStatus = initialData.JobStatus;
            if (finalStatus === "SUCCEEDED") {
                // Combine text
                let extractedText = allBlocks
                    .filter((block) => block.BlockType === "LINE")
                    .map((block) => block.Text)
                    .join("\n");

                // Upload to S3
                const textFileKey = `extractions/${job.id}-${Date.now()}.txt`;
                const uploadParams = {
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: textFileKey,
                    Body: extractedText,
                    ContentType: "text/plain",
                };
                const uploadResult = await s3.upload(uploadParams).promise();
                const textFileUrl = uploadResult.Location;

                // Update job record
                await job.update({
                    status: "completed",
                    outputUrl: textFileUrl,
                });


                questionPaperController.generateQuestionPaperFromExtractedText({ awsJobId });

                return res.status(200).send();
            } else if (finalStatus === "FAILED") {
                await job.update({ status: "failed" });
                return res.status(200).send();
            } else {
                return res.status(200).send();
            }


        } else {
            console.log(`Received SNS message of type ${messageType}, not implemented`);
            return res.status(501).send();
        }
    } catch (error) {
        console.error("Error processing SNS notification:", error);
        return res.status(500).send();
    }
});

export { snsRouter };