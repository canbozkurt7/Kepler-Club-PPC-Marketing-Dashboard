import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..models.alert_rule import AlertRule
from ..models.alert_history import AlertHistory
from ..models.daily_metrics import DailyMetrics

logger = logging.getLogger(__name__)


class AlertEngine:
    """Evaluate metrics against alert rules and trigger notifications."""

    OPERATORS = {
        "<": lambda actual, threshold: actual < threshold,
        ">": lambda actual, threshold: actual > threshold,
        "==": lambda actual, threshold: actual == threshold,
        "<=": lambda actual, threshold: actual <= threshold,
        ">=": lambda actual, threshold: actual >= threshold,
    }

    def __init__(self, db: Session):
        self.db = db

    def evaluate_all_rules(self) -> List[AlertHistory]:
        """Evaluate all enabled alert rules against recent metrics."""
        rules = self.db.query(AlertRule).filter(AlertRule.enabled == True).all()
        triggered_alerts = []

        for rule in rules:
            alerts = self.evaluate_rule(rule)
            triggered_alerts.extend(alerts)

        return triggered_alerts

    def evaluate_rule(self, rule: AlertRule) -> List[AlertHistory]:
        """Evaluate a single rule and return triggered alerts."""
        triggered = []

        # Get recent metrics (last 24 hours)
        yesterday = datetime.utcnow().date() - timedelta(days=1)
        metrics = (
            self.db.query(DailyMetrics)
            .filter(DailyMetrics.metric_date == yesterday)
            .filter(DailyMetrics.location_id == rule.location_id) if rule.location_id else DailyMetrics
        ).all()

        for metric in metrics:
            if self._check_metric(metric, rule):
                alert = self._create_alert(metric, rule)
                triggered.append(alert)

        return triggered

    def _check_metric(self, metric: DailyMetrics, rule: AlertRule) -> bool:
        """Check if a metric triggers the rule."""
        # Get metric value
        actual_value = self._get_metric_value(metric, rule.metric_name)

        if actual_value is None:
            return False

        # Compare with threshold
        operator_func = self.OPERATORS.get(rule.operator)
        if not operator_func:
            logger.warning(f"Unknown operator: {rule.operator}")
            return False

        return operator_func(actual_value, rule.threshold)

    def _get_metric_value(self, metric: DailyMetrics, metric_name: str) -> Optional[float]:
        """Get a metric value from DailyMetrics object."""
        metric_map = {
            "roas": metric.roas,
            "cpa": metric.cpa_eur,
            "cpc": metric.cpc_eur,
            "ctr": metric.ctr,
            "conversions": metric.conversions,
            "spend": metric.spend_eur,
            "clicks": metric.clicks,
            "impressions": metric.impressions,
        }
        return metric_map.get(metric_name)

    def _create_alert(self, metric: DailyMetrics, rule: AlertRule) -> AlertHistory:
        """Create an alert history record."""
        actual_value = self._get_metric_value(metric, rule.metric_name)

        alert = AlertHistory(
            rule_id=rule.id,
            location_id=metric.location_id,
            campaign_id=metric.campaign_id,
            triggered_at=datetime.utcnow(),
            metric_value=actual_value,
            alert_status="TRIGGERED",
        )

        self.db.add(alert)
        self.db.commit()

        logger.info(
            f"Alert triggered: {rule.alert_type} ({rule.severity}) - "
            f"{rule.metric_name} {rule.operator} {rule.threshold}, actual: {actual_value}"
        )

        return alert

    def acknowledge_alert(self, alert_id: int, acknowledged_by: str) -> bool:
        """Mark an alert as acknowledged."""
        alert = self.db.query(AlertHistory).filter(AlertHistory.id == alert_id).first()

        if not alert:
            return False

        alert.alert_status = "ACKNOWLEDGED"
        alert.acknowledged_by = acknowledged_by
        alert.acknowledged_at = datetime.utcnow()

        self.db.commit()
        logger.info(f"Alert {alert_id} acknowledged by {acknowledged_by}")
        return True
