from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://localhost/ppc_dashboard"
    redis_url: str = "redis://localhost:6379"

    # Google Ads
    google_ads_developer_token: str
    google_ads_refresh_token: str
    google_ads_client_id: str
    google_ads_client_secret: str
    google_ads_customer_id: str

    # Meta Ads
    meta_access_token: Optional[str] = None

    # Yandex Ads
    yandex_api_token: Optional[str] = None

    # SMTP Alerts
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str
    smtp_password: str
    alert_email_to: str = "marketing@keplerclub.com"
    alert_email_from: str = "noreply@keplerclub.com"

    # Clarity
    clarity_api_token: Optional[str] = None

    # App settings
    app_name: str = "Kepler PPC Dashboard"
    debug: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
