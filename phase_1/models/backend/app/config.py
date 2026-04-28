"""Application settings via environment variables or .env file."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # postgresql+psycopg2://user:password@host:port/dbname
    database_url: str = "postgresql+psycopg2://ifrpm:ifrpm@localhost:5432/ifrpm_dev"
    model_dir: str = "models"
    rul_critical_threshold: int = 10
    rul_high_threshold: int = 30
    rul_medium_threshold: int = 80

    class Config:
        env_file = ".env"


settings = Settings()
