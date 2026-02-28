"""SQLAlchemy engine, session, and declarative base."""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def init_db() -> None:
    """Create all tables."""
    from app.models import aircraft, component, rul_prediction  # noqa: F401
    Base.metadata.create_all(bind=engine)


def get_db():
    """Yield a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
