import AWS from 'aws-sdk';
import {PutObjectRequest} from 'aws-sdk/clients/s3';
import {v4 as uuidv4} from 'uuid';

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export const uploadToS3 = async (
  fileBuffer: Buffer,
  fileType: string,
): Promise<string> => {
  const params: PutObjectRequest = {
    Bucket: process.env.S3_BUCKET_NAME as string,
    Key: `${uuidv4()}.${fileType}`,
    Body: fileBuffer,
    ACL: 'public-read',
  };

  return new Promise((resolve, reject) => {
    s3.upload(params, (error, data) => {
      if (error) {
        return reject(error);
      }
      resolve(data.Location);
    });
  });
};
