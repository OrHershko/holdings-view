from sqlalchemy import Column, String, Float, Integer, DateTime
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()

class HoldingDB(Base):
    __tablename__ = "holdings"
    user_id = Column(String, primary_key=True, index=True)
    symbol = Column(String, primary_key=True, index=True)
    shares = Column(Float, nullable=False)
    averageCost = Column(Float, nullable=False)
    position = Column(Integer, nullable=False, default=0)

class WatchlistDB(Base):
    __tablename__ = "watchlist"
    user_id = Column(String, primary_key=True, index=True)
    symbol = Column(String, primary_key=True, index=True)

class UserDB(Base):
    __tablename__ = "users"
    uid         = Column(String, primary_key=True, index=True)
    email       = Column(String, nullable=False, unique=True)
    displayName = Column(String)
    createdAt   = Column(DateTime, default=datetime.utcnow)
    updatedAt   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
