// extractRoutes.js

import express from "express";
import AWS from "aws-sdk";
import { Job } from "../models/job.js";
import s3 from "../utils/s3.js";

export const textract = new AWS.Textract({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const extractRouter = express.Router();

// 1) POST /extract/pdf: Creates a new job, starts Textract
extractRouter.post("/pdf", async (req, res) => {
  try {
    const { pdfUrl, metadata } = req.body;
    if (!pdfUrl) {
      return res.status(400).json({ message: "pdfUrl is required" });
    }

    // Create a new job record in DB with status "inProcess"
    const newJob = await Job.create({
      inputUrl: pdfUrl,
      status: "inProcess",
      jobType: "awsTextExtraction",
      metadata,
    });

    const { Bucket, Key } = parseS3Url(pdfUrl);

    const startParams = {
      DocumentLocation: {
        S3Object: {
          Bucket,
          Name: Key,
        },
      },
      // Send notifications to SNS when the job is complete
      NotificationChannel: {
        RoleArn: process.env.TEXTRACT_SNS_ROLE_ARN,   // e.g., arn:aws:iam::<YOUR_ACCOUNT_ID>:role/TextractSNSPublishRole
        SNSTopicArn: process.env.TEXTRACT_SNS_TOPIC_ARN, // e.g., arn:aws:sns:ap-south-1:476114130291:TextractNotifications
      },
    };

    textract.startDocumentTextDetection(startParams, async (err, data) => {
      if (err) {
        console.error("Textract startDocumentTextDetection error:", err);

        // Update job as failed
        await newJob.update({ status: "failed" });

        return res
          .status(500)
          .json({ message: "Failed to start Textract job", error: err });
      }

      // Store the AWS job ID in DB
      await newJob.update({ awsJobId: data.JobId });

      return res.json({
        message: "Extraction job started",
        jobId: newJob.id,
        awsJobId: data.JobId,
        status: "inProcess",
      });
    });
  } catch (error) {
    console.error("Error creating extraction job:", error);
    return res
      .status(500)
      .json({ message: "Error creating extraction job", error: error.message });
  }
});

// 2) GET /extract/pdf/:jobId: Returns the job status and text URL (if done)
extractRouter.get("/pdf/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findByPk(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // If the job is already completed, we can just return
    if (job.status === "completed" || job.status === "failed") {
      return res.json({
        id: job.id,
        status: job.status,
        pdfUrl: job.inputUrl,
        outputUrl: job.outputUrl,
      });
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

      return res.json({
        id: job.id,
        status: job.status,
        pdfUrl: job.inputUrl,
        outputUrl: job.outputUrl,
      });
    } else if (finalStatus === "FAILED") {
      await job.update({ status: "failed" });
      return res.json({
        id: job.id,
        status: job.status,
        pdfUrl: job.inputUrl,
        outputUrl: job.outputUrl
      });
    } else {
      // Possibly IN_PROGRESS or partial
      return res.json({
        id: job.id,
        status: job.status,
        pdfUrl: job.inputUrl,
        outputUrl: job.outputUrl
      });
    }
  } catch (error) {
    console.error("Error fetching extraction job:", error);
    return res
      .status(500)
      .json({ message: "Error fetching extraction job", error: error.message });
  }
});

function parseS3Url(s3Url) {
  let Bucket, Key;

  if (s3Url.startsWith("s3://")) {
    const withoutPrefix = s3Url.replace("s3://", "");
    const [bucket, ...rest] = withoutPrefix.split("/");
    Bucket = bucket;
    Key = rest.join("/");
  } else if (s3Url.startsWith("https://")) {
    const match = s3Url.match(
      /^https:\/\/([^.]+)\.s3\.([^.]*)\.amazonaws\.com\/(.+)$/
    );
    if (match) {
      Bucket = match[1];
      Key = match[3];
    }
  }

  return { Bucket, Key };
}

export { extractRouter };