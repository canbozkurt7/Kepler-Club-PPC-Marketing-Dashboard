import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from ..config import settings
from ..models.alert_history import AlertHistory

logger = logging.getLogger(__name__)


class EmailNotifier:
    """Send email alerts for triggered rules."""

    def __init__(self):
        self.smtp_host = settings.smtp_host
        self.smtp_port = settings.smtp_port
        self.smtp_user = settings.smtp_user
        self.smtp_password = settings.smtp_password
        self.from_address = settings.alert_email_from

    def send_alert(self, alert: AlertHistory, recipient: str = None) -> bool:
        """Send email alert for a triggered rule."""
        recipient = recipient or settings.alert_email_to

        try:
            subject = f"[ALERT] {alert.rule.alert_type.upper()} - {alert.rule.severity}"
            body = self._format_alert_email(alert)

            message = MIMEMultipart()
            message["From"] = self.from_address
            message["To"] = recipient
            message["Subject"] = subject

            message.attach(MIMEText(body, "html"))

            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(message)

            alert.email_sent = recipient
            alert.email_sent_at = __import__("datetime").datetime.utcnow()

            logger.info(f"Alert email sent to {recipient}")
            return True

        except Exception as e:
            logger.error(f"Failed to send alert email: {str(e)}")
            return False

    def send_alerts_batch(self, alerts: List[AlertHistory]) -> int:
        """Send multiple alert emails. Returns count of successfully sent."""
        sent_count = 0
        for alert in alerts:
            if alert.rule.severity in ["CRITICAL", "HIGH"]:
                if self.send_alert(alert):
                    sent_count += 1
        return sent_count

    @staticmethod
    def _format_alert_email(alert: AlertHistory) -> str:
        """Format alert as HTML email body."""
        rule = alert.rule

        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
                    <h2 style="color: #d32f2f; margin: 0;">Alert Triggered</h2>
                    <p style="margin: 10px 0; font-size: 14px; color: #666;">
                        {__import__('datetime').datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}
                    </p>
                </div>

                <div style="padding: 20px;">
                    <h3>Alert Details</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="background-color: #f0f0f0;">
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Type</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">{rule.alert_type}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Severity</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">
                                <span style="background-color: #ff5252; color: white; padding: 5px 10px; border-radius: 4px;">
                                    {rule.severity}
                                </span>
                            </td>
                        </tr>
                        <tr style="background-color: #f0f0f0;">
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Metric</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">{rule.metric_name.upper()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Threshold</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd;">{rule.operator} {rule.threshold}</td>
                        </tr>
                        <tr style="background-color: #f0f0f0;">
                            <td style="padding: 10px; border: 1px solid #ddd;"><strong>Actual Value</strong></td>
                            <td style="padding: 10px; border: 1px solid #ddd; color: #d32f2f; font-weight: bold;">
                                {alert.metric_value}
                            </td>
                        </tr>
                    </table>

                    <p style="margin-top: 20px; padding: 10px; background-color: #e3f2fd; border-left: 4px solid #2196f3; color: #1976d2;">
                        <strong>Action Required:</strong> Please check the dashboard and investigate this alert.
                    </p>
                </div>

                <div style="padding: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                    <p>Kepler Club - PPC Marketing Dashboard</p>
                </div>
            </body>
        </html>
        """

        return html


class DashboardNotifier:
    """Push real-time notifications to WebSocket connections (implemented in API layer)."""

    def __init__(self):
        self.connected_clients = []

    def register_client(self, client_id: str):
        """Register a WebSocket client for notifications."""
        self.connected_clients.append(client_id)
        logger.info(f"Client registered: {client_id}")

    def unregister_client(self, client_id: str):
        """Unregister a WebSocket client."""
        if client_id in self.connected_clients:
            self.connected_clients.remove(client_id)
            logger.info(f"Client unregistered: {client_id}")

    def broadcast_alert(self, alert: AlertHistory):
        """Broadcast alert to all connected clients (WebSocket implementation)."""
        message = {
            "type": "alert_triggered",
            "alert_id": alert.id,
            "severity": alert.rule.severity,
            "alert_type": alert.rule.alert_type,
            "metric_name": alert.rule.metric_name,
            "metric_value": alert.metric_value,
            "timestamp": alert.triggered_at.isoformat(),
        }

        logger.info(f"Broadcasting alert to {len(self.connected_clients)} clients: {message}")
        # Actual WebSocket broadcasting happens in the API layer
        return message
