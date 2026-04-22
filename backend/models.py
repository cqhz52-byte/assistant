import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


class User(TimestampMixin, Base):
    __tablename__ = 'users'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str] = mapped_column(String(32), default='engineer', nullable=False)
    department: Mapped[str] = mapped_column(String(120), default='临床支持部', nullable=False)
    region: Mapped[str] = mapped_column(String(64), default='华东', nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    cases: Mapped[list['ClinicalCase']] = relationship('ClinicalCase', back_populates='engineer')


class Hospital(TimestampMixin, Base):
    __tablename__ = 'hospitals'

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    region: Mapped[str] = mapped_column(String(64), nullable=False)
    level: Mapped[str] = mapped_column(String(32), nullable=False)


class Device(TimestampMixin, Base):
    __tablename__ = 'devices'

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    product_line_id: Mapped[str] = mapped_column(String(64), nullable=False)
    product_line_name: Mapped[str] = mapped_column(String(255), nullable=False)
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(120), nullable=False)
    sn_prefix: Mapped[str] = mapped_column(String(32), nullable=False)
    parameter_schema: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    default_consumables: Mapped[list] = mapped_column(JSON, default=list, nullable=False)


class ClinicalCase(TimestampMixin, Base):
    __tablename__ = 'clinical_cases'

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    case_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    hospital_id: Mapped[str] = mapped_column(String(64), ForeignKey('hospitals.id'), nullable=False)
    hospital_name: Mapped[str] = mapped_column(String(255), nullable=False)
    doctor_name: Mapped[str] = mapped_column(String(120), nullable=False)
    engineer_id: Mapped[str] = mapped_column(String(36), ForeignKey('users.id'), nullable=False)
    engineer_name: Mapped[str] = mapped_column(String(120), nullable=False)
    product_line_id: Mapped[str] = mapped_column(String(64), nullable=False)
    product_line_name: Mapped[str] = mapped_column(String(255), nullable=False)
    device_id: Mapped[str] = mapped_column(String(64), ForeignKey('devices.id'), nullable=False)
    device_name: Mapped[str] = mapped_column(String(255), nullable=False)
    surgery_type: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    abnormal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notes: Mapped[str] = mapped_column(Text, default='', nullable=False)

    engineer: Mapped['User'] = relationship('User', back_populates='cases')
    detail: Mapped['CaseDetail'] = relationship(
        'CaseDetail',
        back_populates='case',
        uselist=False,
        cascade='all, delete-orphan',
    )
    consumables: Mapped[list['Consumable']] = relationship(
        'Consumable',
        back_populates='case',
        cascade='all, delete-orphan',
    )
    media: Mapped[list['Media']] = relationship(
        'Media',
        back_populates='case',
        cascade='all, delete-orphan',
    )


class CaseDetail(TimestampMixin, Base):
    __tablename__ = 'case_details'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey('clinical_cases.id'), unique=True, nullable=False)
    device_id: Mapped[str] = mapped_column(String(64), nullable=False)
    parameters: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    outcome: Mapped[str] = mapped_column(Text, default='', nullable=False)
    complications: Mapped[str] = mapped_column(Text, default='', nullable=False)

    case: Mapped['ClinicalCase'] = relationship('ClinicalCase', back_populates='detail')


class Consumable(TimestampMixin, Base):
    __tablename__ = 'consumables'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey('clinical_cases.id'), nullable=False, index=True)
    item_name: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    batch_no: Mapped[str] = mapped_column(String(120), default='', nullable=False)

    case: Mapped['ClinicalCase'] = relationship('ClinicalCase', back_populates='consumables')


class Media(TimestampMixin, Base):
    __tablename__ = 'media'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey('clinical_cases.id'), nullable=False, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(512), default='', nullable=False)
    file_type: Mapped[str] = mapped_column(String(120), default='image/*', nullable=False)
    file_size: Mapped[str] = mapped_column(String(64), default='', nullable=False)

    case: Mapped['ClinicalCase'] = relationship('ClinicalCase', back_populates='media')
