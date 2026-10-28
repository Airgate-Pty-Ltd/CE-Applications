from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    subscription_type = Column(String)  # 'full' or 'pay_per_doc'
    subscription_end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    documents = relationship("Document", back_populates="owner")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    file_path = Column(String)
    file_type = Column(String)
    file_size = Column(Integer)  # in bytes
    user_id = Column(Integer, ForeignKey("users.id"))
    clauses = Column(JSON)  # List of AS9100 clauses to check
    context = Column(String, nullable=True)
    status = Column(String)  # 'pending', 'processing', 'completed', 'failed'
    created_at = Column(DateTime, default=datetime.utcnow)
    owner = relationship("User", back_populates="documents")
    review = relationship("Review", back_populates="document", uselist=False)

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    compliance_status = Column(String)  # 'compliant', 'non_compliant', 'partial'
    findings = Column(JSON)  # List of non-conformities
    recommendations = Column(JSON)  # List of corrective actions
    completed_at = Column(DateTime, nullable=True)
    document = relationship("Document", back_populates="review")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(Float)
    payment_type = Column(String)  # 'subscription' or 'pay_per_doc'
    status = Column(String)  # 'pending', 'completed', 'failed'
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True) 