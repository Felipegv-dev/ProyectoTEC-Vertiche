import logging
from datetime import datetime, timezone, timedelta
from app.services.supabase_service import supabase_service

logger = logging.getLogger(__name__)


class AlertService:
    async def generate_alerts(self, contract_id: str, metadata: dict) -> None:
        """Generate alerts based on contract metadata."""
        alerts = []
        now = datetime.now(timezone.utc)

        fecha_vencimiento = metadata.get('fecha_vencimiento')
        if fecha_vencimiento:
            try:
                exp_date = datetime.strptime(fecha_vencimiento, '%Y-%m-%d')
                days_until = (exp_date - now.replace(tzinfo=None)).days

                if days_until <= 30 and days_until > 0:
                    alerts.append({
                        "contract_id": contract_id,
                        "alert_type": "expiring_soon",
                        "severity": "critical",
                        "message": f"El contrato vence en {days_until} días ({fecha_vencimiento})",
                        "alert_date": now.isoformat(),
                    })
                elif days_until <= 90 and days_until > 30:
                    alerts.append({
                        "contract_id": contract_id,
                        "alert_type": "expiring_soon",
                        "severity": "high",
                        "message": f"El contrato vence en {days_until} días ({fecha_vencimiento})",
                        "alert_date": now.isoformat(),
                    })
                elif days_until <= 180 and days_until > 90:
                    alerts.append({
                        "contract_id": contract_id,
                        "alert_type": "expiring_notice",
                        "severity": "medium",
                        "message": f"El contrato vence en {days_until} días ({fecha_vencimiento})",
                        "alert_date": now.isoformat(),
                    })
                elif days_until <= 0:
                    alerts.append({
                        "contract_id": contract_id,
                        "alert_type": "expired",
                        "severity": "critical",
                        "message": f"El contrato venció el {fecha_vencimiento}",
                        "alert_date": now.isoformat(),
                    })
            except ValueError:
                pass

        # High rent alert
        renta = metadata.get('renta_mensual')
        metros = metadata.get('metros_cuadrados')
        if renta and metros and metros > 0:
            rent_per_sqm = renta / metros
            if rent_per_sqm > 500:  # Threshold for high rent per sqm
                alerts.append({
                    "contract_id": contract_id,
                    "alert_type": "high_rent",
                    "severity": "medium",
                    "message": f"Renta alta: ${rent_per_sqm:.0f}/m² mensual",
                    "alert_date": now.isoformat(),
                })

        # Save alerts
        for alert in alerts:
            try:
                supabase_service.client.table("dashboard_alerts").insert(alert).execute()
            except Exception as e:
                logger.error(f"Failed to save alert: {e}")

        if alerts:
            logger.info(f"Generated {len(alerts)} alerts for contract {contract_id}")

alert_service = AlertService()
