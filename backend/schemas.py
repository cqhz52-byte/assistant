from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=2, max_length=120)
    role: str = Field(default='engineer')


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserProfile(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
    department: str
    region: str

    model_config = {'from_attributes': True}


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: UserProfile


class ConsumableInput(BaseModel):
    itemName: str = ''
    quantity: int = 1
    batchNo: str = ''


class MediaInput(BaseModel):
    name: str
    size: str = ''
    type: str = 'image/*'
    fileUrl: str = ''


class CaseCreate(BaseModel):
    caseDate: date
    hospitalId: str
    hospitalName: str
    doctorName: str
    engineerName: str
    productLineId: str
    productLineName: str
    deviceId: str
    deviceName: str
    surgeryType: str
    status: str
    abnormal: bool = False
    notes: str = ''
    outcome: str = ''
    complications: str = ''
    parameters: dict = Field(default_factory=dict)
    consumables: list[ConsumableInput] = Field(default_factory=list)
    attachments: list[MediaInput] = Field(default_factory=list)


class CaseResponse(BaseModel):
    id: str
    caseDate: date
    hospitalId: str
    hospitalName: str
    doctorName: str
    engineerId: str
    engineerName: str
    productLineId: str
    productLineName: str
    deviceId: str
    deviceName: str
    surgeryType: str
    status: str
    abnormal: bool
    notes: str
    outcome: str
    complications: str
    parameters: dict
    consumables: list[ConsumableInput]
    attachments: list[MediaInput]
    createdAt: datetime
    updatedAt: datetime


class BootstrapResponse(BaseModel):
    cases: list[CaseResponse]
    totalCases: int
    completedCases: int
    pendingSync: int


class HealthResponse(BaseModel):
    status: str
    api: str
