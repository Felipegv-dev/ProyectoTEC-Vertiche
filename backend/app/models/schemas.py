from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Contract schemas
# ---------------------------------------------------------------------------
class ContractResponse(BaseModel):
    id: str
    file_name: str
    status: str
    created_at: str
    updated_at: str


class ContractMetadataResponse(BaseModel):
    arrendador: Optional[str] = None
    arrendatario: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    estado: Optional[str] = None
    codigo_postal: Optional[str] = None
    metros_cuadrados: Optional[float] = None
    fecha_inicio: Optional[str] = None
    fecha_vencimiento: Optional[str] = None
    duracion_meses: Optional[int] = None
    renta_mensual: Optional[float] = None
    incremento_anual: Optional[float] = None
    deposito_garantia: Optional[float] = None
    moneda: Optional[str] = None
    uso_permitido: Optional[str] = None
    clausula_renovacion: Optional[str] = None
    penalizacion_terminacion_anticipada: Optional[str] = None
    mantenimiento_responsable: Optional[str] = None
    seguros_requeridos: Optional[str] = None
    fiador: Optional[str] = None
    notas_adicionales: Optional[str] = None


class ContractDetailResponse(BaseModel):
    id: str
    file_name: str
    s3_key: str
    status: str
    created_at: str
    updated_at: str
    metadata: Optional[ContractMetadataResponse] = None


class ContractListResponse(BaseModel):
    contracts: list[ContractResponse]
    total: int
    page: int
    page_size: int


# ---------------------------------------------------------------------------
# Chat schemas
# ---------------------------------------------------------------------------
class ChatSessionCreate(BaseModel):
    title: str = "Nueva conversación"
    contract_ids: list[str] = Field(default_factory=list)


class ChatSessionResponse(BaseModel):
    id: str
    title: str
    contract_ids: list[str] = Field(default_factory=list)
    created_at: str
    updated_at: str


class ChatMessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


class ChatSourceResponse(BaseModel):
    contract_id: str
    contract_name: str
    chunk_text: str
    relevance_score: float


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    sources: Optional[list[ChatSourceResponse]] = None
    created_at: str


# ---------------------------------------------------------------------------
# Dashboard schemas
# ---------------------------------------------------------------------------
class DashboardStatsResponse(BaseModel):
    total_contracts: int = 0
    active_contracts: int = 0
    expiring_soon: int = 0
    total_monthly_rent: float = 0.0
    avg_rent_per_sqm: float = 0.0


class ExpiringContractResponse(BaseModel):
    id: str
    file_name: str
    arrendatario: str
    fecha_vencimiento: str
    renta_mensual: float
    days_until_expiry: int


class DashboardAlertResponse(BaseModel):
    id: str
    contract_id: str
    contract_name: str = ""
    alert_type: str
    severity: str
    message: str
    alert_date: str


class RentAnalyticsResponse(BaseModel):
    estado: str
    avg_rent_per_sqm: float
    total_rent: float
    contract_count: int


class TimelineEntryResponse(BaseModel):
    month: str
    count: int
    contracts: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Generic
# ---------------------------------------------------------------------------
class StatusResponse(BaseModel):
    status: str
    message: Optional[str] = None


class UploadResponse(BaseModel):
    contract_id: str
    file_name: str
    status: str = "pending"
