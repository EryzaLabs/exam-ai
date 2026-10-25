import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Bucket names
const BUCKETS = {
  testpapers: process.env.S3_TESTPAPERS_BUCKET || 'exam-ai-testpapers',
  answers: process.env.S3_ANSWERS_BUCKET || 'exam-ai-answers',
  uploads: process.env.S3_UPLOADS_BUCKET || 'exam-ai-uploads',
  reports: process.env.S3_REPORTS_BUCKET || 'exam-ai-reports',
};

export class S3Service {
  /**
   * Upload a file to S3
   */
  static async uploadFile(
    bucket: keyof typeof BUCKETS,
    key: string,
    data: Buffer | string,
    contentType?: string
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: BUCKETS[bucket],
      Key: key,
      Body: data,
      ContentType: contentType || 'application/octet-stream',
    });

    await s3Client.send(command);
    return `s3://${BUCKETS[bucket]}/${key}`;
  }

  /**
   * Upload compressed JSON to S3
   */
  static async uploadCompressedJson(
    bucket: keyof typeof BUCKETS,
    key: string,
    data: any
  ): Promise<string> {
    const jsonString = JSON.stringify(data);
    const compressed = await gzip(jsonString);
    
    return this.uploadFile(bucket, key, compressed, 'application/gzip');
  }

  /**
   * Download a file from S3
   */
  static async downloadFile(bucket: keyof typeof BUCKETS, key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: BUCKETS[bucket],
      Key: key,
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      throw new Error('No data received from S3');
    }

    // Convert stream to buffer
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    
    return Buffer.concat(chunks);
  }

  /**
   * Download and decompress JSON from S3
   */
  static async downloadCompressedJson(
    bucket: keyof typeof BUCKETS,
    key: string
  ): Promise<any> {
    const compressed = await this.downloadFile(bucket, key);
    const decompressed = await gunzip(compressed);
    return JSON.parse(decompressed.toString());
  }

  /**
   * Check if a file exists in S3
   */
  static async fileExists(bucket: keyof typeof BUCKETS, key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: BUCKETS[bucket],
        Key: key,
      });
      await s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Delete a file from S3
   */
  static async deleteFile(bucket: keyof typeof BUCKETS, key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: BUCKETS[bucket],
      Key: key,
    });

    await s3Client.send(command);
  }

  /**
   * List files in S3 bucket with optional prefix
   */
  static async listFiles(
    bucket: keyof typeof BUCKETS,
    prefix?: string
  ): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: BUCKETS[bucket],
      Prefix: prefix,
    });

    const response = await s3Client.send(command);
    return response.Contents?.map((item) => item.Key!) || [];
  }

  /**
   * Get a presigned URL for temporary access (useful for downloads)
   */
  static async getPresignedUrl(
    bucket: keyof typeof BUCKETS,
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKETS[bucket],
      Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
  }

  /**
   * Stream file from S3 (useful for large files)
   */
  static async getFileStream(
    bucket: keyof typeof BUCKETS,
    key: string
  ): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: BUCKETS[bucket],
      Key: key,
    });

    const response = await s3Client.send(command);
    return response.Body as Readable;
  }

  /**
   * Copy file within S3 or between buckets
   */
  static async copyFile(
    sourceBucket: keyof typeof BUCKETS,
    sourceKey: string,
    destBucket: keyof typeof BUCKETS,
    destKey: string
  ): Promise<void> {
    // Download from source
    const data = await this.downloadFile(sourceBucket, sourceKey);
    
    // Upload to destination
    await this.uploadFile(destBucket, destKey, data);
  }

  /**
   * Get file metadata
   */
  static async getFileMetadata(
    bucket: keyof typeof BUCKETS,
    key: string
  ): Promise<{
    size: number;
    lastModified: Date;
    contentType?: string;
  }> {
    const command = new HeadObjectCommand({
      Bucket: BUCKETS[bucket],
      Key: key,
    });

    const response = await s3Client.send(command);
    
    return {
      size: response.ContentLength || 0,
      lastModified: response.LastModified || new Date(),
      contentType: response.ContentType,
    };
  }
}

export default S3Service;
