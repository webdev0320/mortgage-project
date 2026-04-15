import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Local Storage Configuration
    storage_root: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "storage"))
    backend_url: str = "http://localhost:3001"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
