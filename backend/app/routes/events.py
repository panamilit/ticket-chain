from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db


router = APIRouter(
    prefix="/events",
    tags=["Events"]
)


@router.post("/", response_model=schemas.EventResponse, status_code=201)
def create_event(
    event: schemas.EventCreate,
    db: Session = Depends(get_db)
):
    db_event = models.Event(
        contract_event_id=event.contract_event_id,
        name=event.name,
        description=event.description,
        venue=event.venue,
        date=event.date
    )

    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    return db_event


@router.get("/", response_model=list[schemas.EventResponse])
def get_events(db: Session = Depends(get_db)):
    return db.query(models.Event).all()


@router.get("/{event_id}", response_model=schemas.EventResponse)
def get_event(
    event_id: int,
    db: Session = Depends(get_db)
):
    event = db.query(models.Event).filter(
        models.Event.id == event_id
    ).first()

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    return event