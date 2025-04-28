import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import components from our modules
from api.database.database import create_tables, engine
from api.models.models import Base
from api.routes.routes import router as api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("finvest-api")

# Load environment variables for CORS configuration
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://holdings-view.vercel.app")

# Initialize FastAPI app
app = FastAPI(
    title="FinVest API",
    description="API for the FinVest iOS app providing stock data and portfolio management",
    version="1.0.0"
)

# Set up CORS middleware to allow frontend connections
allowed_origins = [
    "http://localhost:8080",             # Local development
    "http://127.0.0.1:8080",
    "http://127.0.0.1:50967",             # Alternative local host format
    FRONTEND_URL,                        # From environment variable
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # In production, you might want to restrict this to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Include all API routes from the routes module
# Note: The routes in routes.py already have /api/ prefix
# We don't add a prefix here because the routes are already prefixed
app.include_router(api_router)

# Create database tables on startup
@app.on_event("startup")
async def startup_event():
    logger.info("Starting FinVest API")
    create_tables(Base, engine)
    logger.info("Database tables created/verified")

# Run the application when executed directly
if __name__ == "__main__":
    import uvicorn
    logger.info("Starting server in development mode")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

