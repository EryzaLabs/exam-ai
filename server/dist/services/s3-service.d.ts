import { Readable } from 'stream';
declare const BUCKETS: {
    testpapers: string;
    answers: string;
    uploads: string;
    reports: string;
};
export declare class S3Service {
    /**
     * Upload a file to S3
     */
    static uploadFile(bucket: keyof typeof BUCKETS, key: string, data: Buffer | string, contentType?: string): Promise<string>;
    /**
     * Upload compressed JSON to S3
     */
    static uploadCompressedJson(bucket: keyof typeof BUCKETS, key: string, data: any): Promise<string>;
    /**
     * Download a file from S3
     */
    static downloadFile(bucket: keyof typeof BUCKETS, key: string): Promise<Buffer>;
    /**
     * Download and decompress JSON from S3
     */
    static downloadCompressedJson(bucket: keyof typeof BUCKETS, key: string): Promise<any>;
    /**
     * Check if a file exists in S3
     */
    static fileExists(bucket: keyof typeof BUCKETS, key: string): Promise<boolean>;
    /**
     * Delete a file from S3
     */
    static deleteFile(bucket: keyof typeof BUCKETS, key: string): Promise<void>;
    /**
     * List files in S3 bucket with optional prefix
     */
    static listFiles(bucket: keyof typeof BUCKETS, prefix?: string): Promise<string[]>;
    /**
     * Get a presigned URL for temporary access (useful for downloads)
     */
    static getPresignedUrl(bucket: keyof typeof BUCKETS, key: string, expiresIn?: number): Promise<string>;
    /**
     * Stream file from S3 (useful for large files)
     */
    static getFileStream(bucket: keyof typeof BUCKETS, key: string): Promise<Readable>;
    /**
     * Copy file within S3 or between buckets
     */
    static copyFile(sourceBucket: keyof typeof BUCKETS, sourceKey: string, destBucket: keyof typeof BUCKETS, destKey: string): Promise<void>;
    /**
     * Get file metadata
     */
    static getFileMetadata(bucket: keyof typeof BUCKETS, key: string): Promise<{
        size: number;
        lastModified: Date;
        contentType?: string;
    }>;
}
export default S3Service;
//# sourceMappingURL=s3-service.d.ts.map