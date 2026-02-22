import logging
from fastapi import APIRouter, Depends

from app.api.auth import get_current_user
from app.models.schemas import (
    DashboardStatsResponse,
    ExpiringContractResponse,
    DashboardAlertResponse,
    RentAnalyticsResponse,
    TimelineEntryResponse,
)
from app.services.supabase_service import supabase_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_stats(user_id: str = Depends(get_current_user)):
    stats = await supabase_service.get_dashboard_stats(user_id)
    return DashboardStatsResponse(**stats)


@router.get("/expiring", response_model=list[ExpiringContractResponse])
async def get_expiring(user_id: str = Depends(get_current_user)):
    contracts = await supabase_service.get_expiring_contracts(user_id)
    return [ExpiringContractResponse(**c) for c in contracts]


@router.get("/alerts", response_model=list[DashboardAlertResponse])
async def get_alerts(user_id: str = Depends(get_current_user)):
    alerts = await supabase_service.get_alerts(user_id)
    return [DashboardAlertResponse(**a) for a in alerts]


@router.get("/rent-analytics", response_model=list[RentAnalyticsResponse])
async def get_rent_analytics(user_id: str = Depends(get_current_user)):
    data = await supabase_service.get_rent_analytics(user_id)
    return [RentAnalyticsResponse(**d) for d in data]


@router.get("/timeline", response_model=list[TimelineEntryResponse])
async def get_timeline(user_id: str = Depends(get_current_user)):
    data = await supabase_service.get_timeline(user_id)
    return [TimelineEntryResponse(**d) for d in data]
