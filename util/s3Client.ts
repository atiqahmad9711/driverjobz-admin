import {
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

class S3ClientUtil {
  private client: S3Client | null = null;
  private privateBucketName: string;
  private cdnUrl: string;

  constructor() {
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const region = process.env.S3_REGION;
    this.privateBucketName = process.env.S3_PRIVATE_BUCKET_NAME || '';
    this.cdnUrl = process.env.CDN_URL || '';

    if (accessKeyId && secretAccessKey && region) {
      this.client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
  }

  /**
   * Generate a presigned download URL for a file in S3
   * Matches backend serializeDocumentsResponseWithURL pattern
   */
  async generatePresignedDownloadUrl(
    filePath: string | null | undefined,
    isPrivate: boolean = true
  ): Promise<string | null> {
    if (!filePath) {
      return null;
    }

    if (!this.client || !this.privateBucketName) {
      return null;
    }

    const command = new GetObjectCommand({
      Bucket: this.privateBucketName,
      Key: filePath,
    });
    console.log("isPrivate:",isPrivate);
    if (isPrivate) {
      console.log('process.env.NODE_ENV:',process.env.NODE_ENV)
      const expiresIn = process.env.NODE_ENV === 'development' ? 60 * 60 * 24 : 60 * 60;
      try {
        const presignedUrl = await getSignedUrl(this.client, command, {
          expiresIn,
        });
        return presignedUrl;
      } catch (error) {
        console.error('Error generating presigned URL:', error);
        return null;
      }
    } else {
      return this.cdnUrl ? `${this.cdnUrl}/${filePath}` : null;
    }
  }
}

export const s3Client = new S3ClientUtil();

