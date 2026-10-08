from fastapi import FastAPI

from . import models
from .database import engine
from .routes import events

from fastapi.middleware.cors import CORSMiddleware


models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TicketChain API",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(events.router)


@app.get("/")
def root():
    return {"message": "TicketChain API"}