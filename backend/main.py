import os
import uuid
from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from .auth import create_access_token, get_current_user, get_password_hash, verify_password
from .database import Base, SessionLocal, engine, get_db
from .models import CaseDetail, ClinicalCase, Consumable, Device, Hospital, Media, User
from .schemas import (
    AuthResponse,
    BootstrapResponse,
    CaseCreate,
    CaseResponse,
    HealthResponse,
    UserLogin,
    UserProfile,
    UserRegister,
)
from .seed_data import DEVICES, HOSPITALS

app = FastAPI(title='Curaway Case Support API', version='1.0.0')


def parse_cors_origins() -> list[str]:
    raw = os.getenv('CORS_ORIGINS', 'http://localhost:5173')
    return [item.strip() for item in raw.split(',') if item.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_cors_origins(),
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


def seed_reference_data() -> None:
    with SessionLocal() as db:
      if not db.scalar(select(Hospital).limit(1)):
          db.add_all([Hospital(**item) for item in HOSPITALS])

      if not db.scalar(select(Device).limit(1)):
          db.add_all([Device(**item) for item in DEVICES])

      db.commit()


@app.on_event('startup')
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    seed_reference_data()


def build_case_response(case: ClinicalCase) -> CaseResponse:
    return CaseResponse(
        id=case.id,
        caseDate=case.case_date,
        hospitalId=case.hospital_id,
        hospitalName=case.hospital_name,
        doctorName=case.doctor_name,
        engineerId=case.engineer_id,
        engineerName=case.engineer_name,
        productLineId=case.product_line_id,
        productLineName=case.product_line_name,
        deviceId=case.device_id,
        deviceName=case.device_name,
        surgeryType=case.surgery_type,
        status=case.status,
        abnormal=case.abnormal,
        notes=case.notes,
        outcome=case.detail.outcome if case.detail else '',
        complications=case.detail.complications if case.detail else '',
        parameters=case.detail.parameters if case.detail else {},
        consumables=[
            {
                'itemName': item.item_name,
                'quantity': item.quantity,
                'batchNo': item.batch_no,
            }
            for item in case.consumables
        ],
        attachments=[
            {
                'name': item.file_name,
                'size': item.file_size,
                'type': item.file_type,
                'fileUrl': item.file_url,
            }
            for item in case.media
        ],
        createdAt=case.created_at,
        updatedAt=case.updated_at,
    )


def generate_case_id() -> str:
    return f"CASE-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"


@app.get('/api/health', response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status='ok', api='curaway-case-support')


@app.post('/api/auth/register', response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)) -> AuthResponse:
    existing_user = db.scalar(select(User).where(User.email == payload.email))
    if existing_user:
        raise HTTPException(status_code=409, detail='该邮箱已注册。')

    user = User(
        email=payload.email,
        name=payload.name,
        role=payload.role,
        department='临床支持部',
        region='华东',
        password_hash=get_password_hash(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return AuthResponse(access_token=token, user=UserProfile.model_validate(user))


@app.post('/api/auth/login', response_model=AuthResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail='邮箱或密码错误。')

    token = create_access_token(user.id)
    return AuthResponse(access_token=token, user=UserProfile.model_validate(user))


@app.get('/api/auth/me')
def me(current_user: User = Depends(get_current_user)) -> dict:
    return {'user': UserProfile.model_validate(current_user)}


@app.get('/api/case-support/bootstrap', response_model=BootstrapResponse)
def get_bootstrap(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BootstrapResponse:
    del current_user
    cases = list(
        db.scalars(
            select(ClinicalCase)
            .options(
                selectinload(ClinicalCase.detail),
                selectinload(ClinicalCase.consumables),
                selectinload(ClinicalCase.media),
            )
            .order_by(ClinicalCase.updated_at.desc())
            .limit(12)
        )
    )

    total_cases = db.query(ClinicalCase).count()
    completed_cases = db.query(ClinicalCase).filter(ClinicalCase.status == '已完成').count()
    pending_sync = db.query(ClinicalCase).filter(ClinicalCase.status == '待同步').count()

    return BootstrapResponse(
        cases=[build_case_response(case) for case in cases],
        totalCases=total_cases,
        completedCases=completed_cases,
        pendingSync=pending_sync,
    )


@app.get('/api/case-support/cases', response_model=list[CaseResponse])
def list_cases(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CaseResponse]:
    del current_user
    cases = list(
        db.scalars(
            select(ClinicalCase)
            .options(
                selectinload(ClinicalCase.detail),
                selectinload(ClinicalCase.consumables),
                selectinload(ClinicalCase.media),
            )
            .order_by(ClinicalCase.updated_at.desc())
        )
    )
    return [build_case_response(case) for case in cases]


@app.post('/api/case-support/cases')
def create_case(
    payload: CaseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    hospital = db.get(Hospital, payload.hospitalId)
    device = db.get(Device, payload.deviceId)

    if not hospital:
        raise HTTPException(status_code=404, detail='未找到对应医院。')
    if not device:
        raise HTTPException(status_code=404, detail='未找到对应设备。')

    case = ClinicalCase(
        id=generate_case_id(),
        case_date=payload.caseDate,
        hospital_id=payload.hospitalId,
        hospital_name=hospital.name,
        doctor_name=payload.doctorName,
        engineer_id=current_user.id,
        engineer_name=payload.engineerName or current_user.name,
        product_line_id=payload.productLineId,
        product_line_name=payload.productLineName or device.product_line_name,
        device_id=payload.deviceId,
        device_name=device.model_name,
        surgery_type=payload.surgeryType,
        status=payload.status,
        abnormal=payload.abnormal,
        notes=payload.notes,
    )

    case.detail = CaseDetail(
        device_id=payload.deviceId,
        parameters=payload.parameters,
        outcome=payload.outcome,
        complications=payload.complications,
    )
    case.consumables = [
        Consumable(
            item_name=item.itemName or '未命名耗材',
            quantity=item.quantity or 1,
            batch_no=item.batchNo or '',
        )
        for item in payload.consumables
    ]
    case.media = [
        Media(
            file_name=item.name,
            file_url=item.fileUrl or '',
            file_type=item.type or 'image/*',
            file_size=item.size or '',
        )
        for item in payload.attachments
    ]

    db.add(case)
    db.commit()
    db.refresh(case)

    case = db.scalar(
        select(ClinicalCase)
        .where(ClinicalCase.id == case.id)
        .options(
            selectinload(ClinicalCase.detail),
            selectinload(ClinicalCase.consumables),
            selectinload(ClinicalCase.media),
        )
    )
    total_cases = db.query(ClinicalCase).count()

    return {
        'case': build_case_response(case).model_dump(),
        'totalCases': total_cases,
    }
