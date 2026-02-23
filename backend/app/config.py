from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_key: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    # AWS
    aws_access_key_id: str
    aws_secret_access_key: str
    aws_region: str = "us-east-1"
    s3_bucket_name: str

    # Anthropic
    anthropic_api_key: str

    # App
    environment: str = "development"

    model_config = {"env_file": "../.env", "extra": "ignore"}


settings = Settings()