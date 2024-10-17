import AWS from 'aws-sdk';
import {
  ManagedUpload,
  PutObjectRequest,
  StorageClass,
} from 'aws-sdk/clients/s3';

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export const uploadToS3 = async ({
  fileBuffer,
  key,
  storageClass,
  fileType,
}: {
  fileBuffer: Buffer;
  key: string;
  storageClass: StorageClass;
  fileType: string;
}): Promise<ManagedUpload.SendData> => {
  const params: PutObjectRequest = {
    Bucket: process.env.S3_BUCKET_NAME as string,
    Key: key,
    Body: fileBuffer,
    StorageClass: storageClass,
    ContentType: fileType,
  };

  return await s3.upload(params).promise();
};

export const getSignedUrl = (key: string): string => {
  return s3.getSignedUrl('getObject', {
    Bucket: process.env.S3_BUCKET_NAME as string,
    Key: key,
    Expires: 900,
    ResponseContentDisposition: 'inline',
  });
};
