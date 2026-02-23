import logging
from datetime import datetime, timezone
from supabase import create_client
from app.config import settings

logger = logging.getLogger(__name__)


class SupabaseService:
    def __init__(self):
        self.client = create_client(settings.supabase_url, settings.supabase_service_role_key)

    # ---- Contracts ----

    async def create_contract(self, user_id: str, file_name: str, s3_key: str) -> dict:
        result = self.client.table("contracts").insert({
            "user_id": user_id,
            "file_name": file_name,
            "s3_key": s3_key,
            "status": "pending",
        }).execute()
        return result.data[0]

    async def get_contract(self, contract_id: str, user_id: str) -> dict | None:
        result = self.client.table("contracts").select("*").eq("id", contract_id).eq("user_id", user_id).execute()
        return result.data[0] if result.data else None

    async def list_contracts(self, user_id: str, page: int = 1, page_size: int = 10, search: str | None = None) -> tuple[list[dict], int]:
        query = self.client.table("contracts").select("*", count="exact").eq("user_id", user_id)

        if search:
            query = query.ilike("file_name", f"%{search}%")

        query = query.order("created_at", desc=True)
        offset = (page - 1) * page_size
        query = query.range(offset, offset + page_size - 1)

        result = query.execute()
        return result.data, result.count or 0

    async def update_contract_status(self, contract_id: str, status: str) -> None:
        self.client.table("contracts").update({
            "status": status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", contract_id).execute()

    async def delete_contract(self, contract_id: str, user_id: str) -> None:
        self.client.table("contracts").delete().eq("id", contract_id).eq("user_id", user_id).execute()
        # Also delete related data
        self.client.table("contract_metadata").delete().eq("contract_id", contract_id).execute()
        self.client.table("contract_embeddings").delete().eq("contract_id", contract_id).execute()
        self.client.table("dashboard_alerts").delete().eq("contract_id", contract_id).execute()

    # ---- Contract Metadata ----

    async def save_metadata(self, contract_id: str, metadata: dict) -> dict:
        data = {"contract_id": contract_id, **metadata}
        # Upsert: update if exists, insert if not
        result = self.client.table("contract_metadata").upsert(data, on_conflict="contract_id").execute()
        return result.data[0] if result.data else {}

    async def get_metadata(self, contract_id: str) -> dict | None:
        result = self.client.table("contract_metadata").select("*").eq("contract_id", contract_id).execute()
        return result.data[0] if result.data else None

    # ---- Chat Sessions ----

    async def create_chat_session(self, user_id: str, title: str, contract_ids: list[str]) -> dict:
        result = self.client.table("chat_sessions").insert({
            "user_id": user_id,
            "title": title,
            "contract_ids": contract_ids,
        }).execute()
        return result.data[0]

    async def list_chat_sessions(self, user_id: str) -> list[dict]:
        result = self.client.table("chat_sessions").select("*").eq("user_id", user_id).order("updated_at", desc=True).execute()
        return result.data

    async def get_chat_session(self, session_id: str, user_id: str) -> dict | None:
        result = self.client.table("chat_sessions").select("*").eq("id", session_id).eq("user_id", user_id).execute()
        return result.data[0] if result.data else None

    async def delete_chat_session(self, session_id: str, user_id: str) -> None:
        self.client.table("chat_messages").delete().eq("session_id", session_id).execute()
        self.client.table("chat_sessions").delete().eq("id", session_id).eq("user_id", user_id).execute()

    # ---- Chat Messages ----

    async def save_message(self, session_id: str, role: str, content: str, sources: list | None = None) -> dict:
        data = {
            "session_id": session_id,
            "role": role,
            "content": content,
        }
        if sources:
            data["sources"] = sources
        result = self.client.table("chat_messages").insert(data).execute()

        # Update session timestamp
        self.client.table("chat_sessions").update({
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", session_id).execute()

        return result.data[0]

    async def get_messages(self, session_id: str) -> list[dict]:
        result = self.client.table("chat_messages").select("*").eq("session_id", session_id).order("created_at", desc=False).execute()
        return result.data

    # ---- Dashboard ----

    async def get_dashboard_stats(self, user_id: str) -> dict:
        # Get all contracts with metadata
        contracts = self.client.table("contracts").select("id, status").eq("user_id", user_id).execute()
        metadata = self.client.table("contract_metadata").select("contract_id, renta_mensual, metros_cuadrados, fecha_vencimiento").execute()

        total = len(contracts.data)
        active = sum(1 for c in contracts.data if c['status'] == 'ready')

        contract_ids = {c['id'] for c in contracts.data}
        user_meta = [m for m in metadata.data if m['contract_id'] in contract_ids]

        total_rent = sum(m.get('renta_mensual') or 0 for m in user_meta)

        total_sqm = sum(m.get('metros_cuadrados') or 0 for m in user_meta if m.get('renta_mensual') and m.get('metros_cuadrados'))
        total_rent_for_avg = sum(m.get('renta_mensual') or 0 for m in user_meta if m.get('renta_mensual') and m.get('metros_cuadrados'))
        avg_rent_sqm = round(total_rent_for_avg / total_sqm, 2) if total_sqm > 0 else 0

        # Count expiring in 90 days
        from datetime import timedelta
        now = datetime.now(timezone.utc)
        threshold = (now + timedelta(days=90)).strftime('%Y-%m-%d')
        expiring = sum(
            1 for m in user_meta
            if m.get('fecha_vencimiento') and m['fecha_vencimiento'] <= threshold and m['fecha_vencimiento'] >= now.strftime('%Y-%m-%d')
        )

        return {
            "total_contracts": total,
            "active_contracts": active,
            "expiring_soon": expiring,
            "total_monthly_rent": total_rent,
            "avg_rent_per_sqm": avg_rent_sqm,
        }

    async def get_expiring_contracts(self, user_id: str, days: int = 180) -> list[dict]:
        from datetime import timedelta
        now = datetime.now(timezone.utc)
        threshold = (now + timedelta(days=days)).strftime('%Y-%m-%d')
        today = now.strftime('%Y-%m-%d')

        contracts = self.client.table("contracts").select("id, file_name").eq("user_id", user_id).eq("status", "ready").execute()
        contract_ids = [c['id'] for c in contracts.data]
        contract_map = {c['id']: c['file_name'] for c in contracts.data}

        if not contract_ids:
            return []

        metadata = self.client.table("contract_metadata").select("*").in_("contract_id", contract_ids).gte("fecha_vencimiento", today).lte("fecha_vencimiento", threshold).order("fecha_vencimiento", desc=False).execute()

        result = []
        for m in metadata.data:
            exp_date = datetime.strptime(m['fecha_vencimiento'], '%Y-%m-%d')
            days_until = (exp_date - now.replace(tzinfo=None)).days
            result.append({
                "id": m['contract_id'],
                "file_name": contract_map.get(m['contract_id'], ''),
                "arrendatario": m.get('arrendatario', ''),
                "fecha_vencimiento": m['fecha_vencimiento'],
                "renta_mensual": m.get('renta_mensual', 0),
                "days_until_expiry": days_until,
            })

        return result

    async def get_alerts(self, user_id: str) -> list[dict]:
        contracts = self.client.table("contracts").select("id").eq("user_id", user_id).execute()
        contract_ids = [c['id'] for c in contracts.data]

        if not contract_ids:
            return []

        result = self.client.table("dashboard_alerts").select("*").in_("contract_id", contract_ids).order("alert_date", desc=True).limit(20).execute()

        # Enrich with contract names
        contract_names = {}
        for c in contracts.data:
            contract_names[c['id']] = c.get('file_name', '')

        # Get names from contracts table
        contracts_full = self.client.table("contracts").select("id, file_name").in_("id", contract_ids).execute()
        for c in contracts_full.data:
            contract_names[c['id']] = c['file_name']

        for alert in result.data:
            alert['contract_name'] = contract_names.get(alert['contract_id'], '')

        return result.data

    async def get_rent_analytics(self, user_id: str) -> list[dict]:
        contracts = self.client.table("contracts").select("id").eq("user_id", user_id).eq("status", "ready").execute()
        contract_ids = [c['id'] for c in contracts.data]

        if not contract_ids:
            return []

        metadata = self.client.table("contract_metadata").select("estado, renta_mensual, metros_cuadrados").in_("contract_id", contract_ids).execute()

        # Aggregate by state
        states = {}
        for m in metadata.data:
            estado = m.get('estado')
            if not estado:
                continue
            if estado not in states:
                states[estado] = {"total_rent": 0, "total_sqm": 0, "count": 0}
            states[estado]["total_rent"] += m.get('renta_mensual') or 0
            states[estado]["total_sqm"] += m.get('metros_cuadrados') or 0
            states[estado]["count"] += 1

        result = []
        for estado, data in sorted(states.items()):
            avg_sqm = round(data["total_rent"] / data["total_sqm"], 2) if data["total_sqm"] > 0 else 0
            result.append({
                "estado": estado,
                "avg_rent_per_sqm": avg_sqm,
                "total_rent": data["total_rent"],
                "contract_count": data["count"],
            })

        return result

    async def get_timeline(self, user_id: str) -> list[dict]:
        contracts = self.client.table("contracts").select("id, file_name").eq("user_id", user_id).eq("status", "ready").execute()
        contract_ids = [c['id'] for c in contracts.data]
        contract_map = {c['id']: c['file_name'] for c in contracts.data}

        if not contract_ids:
            return []

        metadata = self.client.table("contract_metadata").select("contract_id, fecha_vencimiento").in_("contract_id", contract_ids).not_.is_("fecha_vencimiento", "null").execute()

        # Group by month
        months = {}
        for m in metadata.data:
            month = m['fecha_vencimiento'][:7]  # YYYY-MM
            if month not in months:
                months[month] = {"count": 0, "contracts": []}
            months[month]["count"] += 1
            months[month]["contracts"].append(contract_map.get(m['contract_id'], ''))

        # Sort and return last 12 months
        result = [
            {"month": k, "count": v["count"], "contracts": v["contracts"]}
            for k, v in sorted(months.items())
        ]

        return result[-12:] if len(result) > 12 else result

supabase_service = SupabaseService()
