import express from 'express';
import multer from 'multer';
import s3 from '../utils/s3.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

router.post('/upload', upload.single('file'), async (req, res) => {
    try {
      const file = req.file;
  
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
  
      const params = {
        Bucket: BUCKET_NAME,
        Key: file.originalname, 
        Body: file.buffer,
      };
  
      const result = await s3.upload(params).promise();
  
      res.json({
        message: 'File uploaded successfully',
        url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.originalname}`,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ message: 'Error uploading file', error: error.message });
    }
  });

export default router;