from datetime import date

from pydantic import BaseModel, ConfigDict


class EventCreate(BaseModel):
    name: str
    description: str
    venue: str
    date: date


class EventResponse(EventCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


