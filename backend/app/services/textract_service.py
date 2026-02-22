import boto3
import time
import logging
from app.config import settings

logger = logging.getLogger(__name__)


class TextractService:
    def __init__(self):
        self.client = boto3.client(
            'textract',
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
        )
        self.bucket = settings.s3_bucket_name

    async def extract_text(self, s3_key: str) -> str:
        """Start async Textract job and wait for completion, return extracted text."""
        # Start async job
        response = self.client.start_document_text_detection(
            DocumentLocation={
                'S3Object': {
                    'Bucket': self.bucket,
                    'Name': s3_key,
                }
            }
        )
        job_id = response['JobId']
        logger.info(f"Started Textract job {job_id} for {s3_key}")

        # Poll for completion
        while True:
            result = self.client.get_document_text_detection(JobId=job_id)
            status = result['JobStatus']

            if status == 'SUCCEEDED':
                break
            elif status == 'FAILED':
                raise Exception(f"Textract job failed: {result.get('StatusMessage', 'Unknown error')}")

            time.sleep(2)

        # Collect all pages
        pages = [result]
        next_token = result.get('NextToken')

        while next_token:
            result = self.client.get_document_text_detection(
                JobId=job_id, NextToken=next_token
            )
            pages.append(result)
            next_token = result.get('NextToken')

        # Extract text from blocks
        text_parts = []
        for page in pages:
            for block in page.get('Blocks', []):
                if block['BlockType'] == 'LINE':
                    text_parts.append(block.get('Text', ''))

        full_text = '\n'.join(text_parts)
        logger.info(f"Extracted {len(full_text)} chars from {s3_key}")
        return full_text


textract_service = TextractService()
