from fastapi import FastAPI

from . import models
from .database import engine


models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Blockchain Ticketing API",
    version="0.1.0"
)


@app.get("/")
def root():
    return {
        "message": "Blockchain Ticketing API"
    }