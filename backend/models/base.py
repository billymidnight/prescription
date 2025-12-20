"""
SQLAlchemy base models (if needed for direct database access).
Currently using Supabase SDK for database operations.
"""

from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, String, DateTime
from datetime import datetime

Base = declarative_base()


# Example model (optional - Supabase SDK is primary method)
class BaseModel(Base):
    __abstract__ = True
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Add more models here if needed
