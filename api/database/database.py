import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

# Load environment variables from .env and .env.local
load_dotenv()  # Load .env first
load_dotenv(".env.local")  # Then load .env.local, which will override .env values

# Try different environment variable names (Vercel/Neon naming conventions)
DATABASE_URL = (
    os.getenv("STORAGE_URL") or  # Vercel integration name
    os.getenv("POSTGRES_URL") or  # Previous name
    os.getenv("DATABASE_URL")     # Generic name
)

if not DATABASE_URL:
    raise ValueError(
        "Database URL not found. Ensure either STORAGE_URL, POSTGRES_URL, or DATABASE_URL "
        "is set in your .env.local file or Vercel environment variables."
    )

# Ensure URL uses postgresql+psycopg2:// instead of postgres:// or postgresql://
if DATABASE_URL.startswith(('postgres://', 'postgresql://')):
    DATABASE_URL = 'postgresql+psycopg2://' + DATABASE_URL.split('://', 1)[1]

print(f"Initializing database connection...")  # Debug log

try:
    # Configure SQLAlchemy engine with explicit dialect
    engine = create_engine(
        DATABASE_URL,
        connect_args={"sslmode": "require"},  # Required for Neon/Vercel Postgres
        pool_pre_ping=True  # Add connection health check
    )
    
    # Test the connection
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        print("Database connection successful!")
except Exception as e:
    print(f"Error connecting to database: {str(e)}")
    raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables if they don't exist
def create_tables(Base, engine):
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully!")
    except Exception as e:
        print(f"Error creating database tables: {str(e)}")
        raise

# Function to get a database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
