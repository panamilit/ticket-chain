from datetime import date

from sqlalchemy import Date, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    contract_event_id: Mapped[int] = mapped_column(
        Integer,
        unique=True,
        nullable=False
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False
    )

    venue: Mapped[str] = mapped_column(
        String(200),
        nullable=False
    )

    date: Mapped[date] = mapped_column(
        Date,
        nullable=False
    )