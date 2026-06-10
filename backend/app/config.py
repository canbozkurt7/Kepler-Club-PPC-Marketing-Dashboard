from pydantic_settings import BaseSettings
from typing import Optional, List


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://localhost/ppc_dashboard"
    redis_url: str = "redis://localhost:6379"

    # Google Ads (required for sync, but app boots without them)
    google_ads_developer_token: Optional[str] = None
    google_ads_refresh_token: Optional[str] = None
    google_ads_client_id: Optional[str] = None
    google_ads_client_secret: Optional[str] = None
    google_ads_customer_id: Optional[str] = None

    # Meta Ads
    meta_access_token: Optional[str] = None

    # Yandex Ads
    yandex_api_token: Optional[str] = None

    # SMTP Alerts (required for email alerts, but app boots without them)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
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

    def missing_google_ads_credentials(self) -> List[str]:
        """Names of unset Google Ads settings (empty list = fully configured)."""
        fields = {
            "GOOGLE_ADS_DEVELOPER_TOKEN": self.google_ads_developer_token,
            "GOOGLE_ADS_REFRESH_TOKEN": self.google_ads_refresh_token,
            "GOOGLE_ADS_CLIENT_ID": self.google_ads_client_id,
            "GOOGLE_ADS_CLIENT_SECRET": self.google_ads_client_secret,
            "GOOGLE_ADS_CUSTOMER_ID": self.google_ads_customer_id,
        }
        return [name for name, value in fields.items() if not value]

    def missing_smtp_credentials(self) -> List[str]:
        """Names of unset SMTP settings (empty list = fully configured)."""
        fields = {
            "SMTP_USER": self.smtp_user,
            "SMTP_PASSWORD": self.smtp_password,
        }
        return [name for name, value in fields.items() if not value]


settings = Settings()
