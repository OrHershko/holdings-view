import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

load_dotenv() 
load_dotenv(".env.local")  

DATABASE_URL = (
    os.getenv("STORAGE_URL") or 
    os.getenv("POSTGRES_URL") or 
    os.getenv("DATABASE_URL")    
)

if not DATABASE_URL:
    raise ValueError(
        "Database URL not found. Ensure either STORAGE_URL, POSTGRES_URL, or DATABASE_URL "
        "is set in your .env.local file or Vercel environment variables."
    )

if DATABASE_URL.startswith(('postgres://', 'postgresql://')):
    DATABASE_URL = 'postgresql+psycopg2://' + DATABASE_URL.split('://', 1)[1]

print(f"Initializing database connection...")  

try:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"sslmode": "require"}, 
        pool_pre_ping=True 
    )
    
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        print("Database connection successful!")
except Exception as e:
    print(f"Error connecting to database: {str(e)}")
    raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables(Base, engine):
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully!")
    except Exception as e:
        print(f"Error creating database tables: {str(e)}")
        raise

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
