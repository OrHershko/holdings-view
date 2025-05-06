import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.database.database import create_tables, engine
from api.models.models import Base
from api.routes.routes import router as api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("finvest-api")

FRONTEND_URL = os.getenv("FRONTEND_URL", "https://holdings-view.vercel.app")

app = FastAPI(
    title="FinVest API",
    description="API for the FinVest iOS app providing stock data and portfolio management",
    version="1.0.0"
)

allowed_origins = [
    "http://localhost:8080",             
    "http://127.0.0.1:8080",
    "http://127.0.0.1:50967",             
    "http://127.0.0.1:51096",             
    FRONTEND_URL,                        
    "*",                                  
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting FinVest API")
    create_tables(Base, engine)
    logger.info("Database tables created/verified")

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting server in development mode")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

