from fastapi import FastAPI

from . import models
from .database import engine
from .routes import events


models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TicketChain API",
    version="0.1.0"
)

app.include_router(events.router)


@app.get("/")
def root():
    return {"message": "TicketChain API"}