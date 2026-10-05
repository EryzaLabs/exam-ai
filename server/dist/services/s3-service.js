"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Service = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const zlib = __importStar(require("zlib"));
const util_1 = require("util");
const gzip = (0, util_1.promisify)(zlib.gzip);
const gunzip = (0, util_1.promisify)(zlib.gunzip);
// Initialize S3 Client
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
// Bucket names
const BUCKETS = {
    testpapers: process.env.S3_TESTPAPERS_BUCKET || 'exam-ai-testpapers',
    answers: process.env.S3_ANSWERS_BUCKET || 'exam-ai-answers',
    uploads: process.env.S3_UPLOADS_BUCKET || 'exam-ai-uploads',
    reports: process.env.S3_REPORTS_BUCKET || 'exam-ai-reports',
};
class S3Service {
    /**
     * Upload a file to S3
     */
    static async uploadFile(bucket, key, data, contentType) {
        const command = new client_s3_1.PutObjectCommand({
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
    static async uploadCompressedJson(bucket, key, data) {
        const jsonString = JSON.stringify(data);
        const compressed = await gzip(jsonString);
        return this.uploadFile(bucket, key, compressed, 'application/gzip');
    }
    /**
     * Download a file from S3
     */
    static async downloadFile(bucket, key) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: BUCKETS[bucket],
            Key: key,
        });
        const response = await s3Client.send(command);
        if (!response.Body) {
            throw new Error('No data received from S3');
        }
        // Convert stream to buffer
        const stream = response.Body;
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks);
    }
    /**
     * Download and decompress JSON from S3
     */
    static async downloadCompressedJson(bucket, key) {
        const compressed = await this.downloadFile(bucket, key);
        const decompressed = await gunzip(compressed);
        return JSON.parse(decompressed.toString());
    }
    /**
     * Check if a file exists in S3
     */
    static async fileExists(bucket, key) {
        try {
            const command = new client_s3_1.HeadObjectCommand({
                Bucket: BUCKETS[bucket],
                Key: key,
            });
            await s3Client.send(command);
            return true;
        }
        catch (error) {
            if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
                return false;
            }
            throw error;
        }
    }
    /**
     * Delete a file from S3
     */
    static async deleteFile(bucket, key) {
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket: BUCKETS[bucket],
            Key: key,
        });
        await s3Client.send(command);
    }
    /**
     * List files in S3 bucket with optional prefix
     */
    static async listFiles(bucket, prefix) {
        const command = new client_s3_1.ListObjectsV2Command({
            Bucket: BUCKETS[bucket],
            Prefix: prefix,
        });
        const response = await s3Client.send(command);
        return response.Contents?.map((item) => item.Key) || [];
    }
    /**
     * Get a presigned URL for temporary access (useful for downloads)
     */
    static async getPresignedUrl(bucket, key, expiresIn = 3600) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: BUCKETS[bucket],
            Key: key,
        });
        return (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn });
    }
    /**
     * Stream file from S3 (useful for large files)
     */
    static async getFileStream(bucket, key) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: BUCKETS[bucket],
            Key: key,
        });
        const response = await s3Client.send(command);
        return response.Body;
    }
    /**
     * Copy file within S3 or between buckets
     */
    static async copyFile(sourceBucket, sourceKey, destBucket, destKey) {
        // Download from source
        const data = await this.downloadFile(sourceBucket, sourceKey);
        // Upload to destination
        await this.uploadFile(destBucket, destKey, data);
    }
    /**
     * Get file metadata
     */
    static async getFileMetadata(bucket, key) {
        const command = new client_s3_1.HeadObjectCommand({
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
exports.S3Service = S3Service;
exports.default = S3Service;
//# sourceMappingURL=s3-service.js.map