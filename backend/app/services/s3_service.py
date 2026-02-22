import boto3
from app.config import settings


class S3Service:
    def __init__(self):
        self.client = boto3.client(
            's3',
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
        )
        self.bucket = settings.s3_bucket_name

    async def upload_file(self, file_content: bytes, s3_key: str, content_type: str = 'application/pdf') -> str:
        """Upload file to S3 and return the S3 key."""
        self.client.put_object(
            Bucket=self.bucket,
            Key=s3_key,
            Body=file_content,
            ContentType=content_type,
        )
        return s3_key

    async def get_download_url(self, s3_key: str, expires_in: int = 3600) -> str:
        """Generate a presigned download URL."""
        return self.client.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket, 'Key': s3_key},
            ExpiresIn=expires_in,
        )

    async def delete_file(self, s3_key: str) -> None:
        """Delete a file from S3."""
        self.client.delete_object(Bucket=self.bucket, Key=s3_key)


s3_service = S3Service()
