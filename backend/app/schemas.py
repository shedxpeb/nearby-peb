from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class Envelope(BaseModel):
    success: bool = True
    data: object | None = None


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    phone: str = Field(min_length=8, max_length=32)
    email: EmailStr | None = None
    password: str = Field(min_length=6, max_length=128)


class LoginRequest(BaseModel):
    phone: str = Field(min_length=8, max_length=32)
    password: str = Field(min_length=1, max_length=128)


class WorkerUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    primary_trade: str | None = None
    years_experience: int | None = Field(default=None, ge=0, le=80)
    professional_bio: str | None = None
    previous_company: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_number: str | None = None
    preferred_work_type: str | None = None
    languages: str | None = None


class StatusUpdate(BaseModel):
    status: str = Field(pattern="^(ONLINE|OFFLINE|BUSY)$")


class JobAction(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class ProgressUpdate(BaseModel):
    progress_percent: int = Field(ge=0, le=100)
    status: str = Field(pattern="^(INSPECTION|IN_PROGRESS|MATERIAL_REPLACEMENT|REPAIR_COMPLETED|FINAL_INSPECTION)$")
    current_task: str | None = None
    notes: str | None = None


class MaterialCreate(BaseModel):
    material_id: str
    quantity: Decimal = Field(gt=0)
    unit_rate: Decimal = Field(ge=0)
    notes: str | None = None


class ExpenseCreate(BaseModel):
    category: str = Field(pattern="^(TRAVEL|TRANSPORT|TOOLS|MISCELLANEOUS)$")
    description: str | None = None
    amount: Decimal = Field(ge=0)
    receipt_url: str | None = None


class CustomerConfirmationCreate(BaseModel):
    customer_name: str = Field(min_length=2, max_length=160)
    rating: int = Field(ge=1, le=5)
    signature_url: str | None = None
    comments: str | None = None


class TicketCreate(BaseModel):
    job_id: str | None = None
    category: str = Field(min_length=2, max_length=100)
    priority: str = Field(pattern="^(LOW|MEDIUM|HIGH|URGENT)$")
    subject: str = Field(min_length=2, max_length=180)
    description: str = Field(min_length=2)


class MessageCreate(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    attachment_url: str | None = None


class CustomerUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    profile_photo_url: str | None = None
    company_name: str | None = None
    contact_person: str | None = None
    preferred_communication: str | None = Field(default=None, pattern="^(CALL|WHATSAPP|EMAIL)$")


class SiteCreate(BaseModel):
    site_name: str = Field(min_length=2, max_length=180)
    address_line: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    contact_name: str | None = None
    contact_phone: str | None = None
    notes: str | None = None


class JobCreate(BaseModel):
    service_type: str = Field(min_length=2, max_length=120)
    site_id: str
    title: str = Field(min_length=2, max_length=180)
    problem_description: str | None = None
    notes: str | None = None
    priority: str = Field(default="NORMAL", pattern="^(NORMAL|URGENT|HIGH)$")
    scheduled_at: datetime | None = None
    photo_urls: list[str] = Field(default_factory=list, max_length=10)
