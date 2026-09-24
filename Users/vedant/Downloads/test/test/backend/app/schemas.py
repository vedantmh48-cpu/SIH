"""Pydantic request/response schemas with validation rules."""
from __future__ import annotations

import re
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def validate_email(value: str) -> str:
    value = value.strip().lower()
    if not EMAIL_RE.match(value):
        raise ValueError("Please provide a valid email address")
    return value


def validate_password(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters")
    return value


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str
    password: str
    confirm_password: str

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return validate_email(v)

    @field_validator("password")
    @classmethod
    def _password(cls, v: str) -> str:
        return validate_password(v)

    @model_validator(mode="after")
    def _match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class UserLogin(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return validate_email(v)


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=10)


class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return validate_email(v)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10)
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def _password(cls, v: str) -> str:
        return validate_password(v)

    @model_validator(mode="after")
    def _match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _password(cls, v: str) -> str:
        return validate_password(v)


# ---------------------------------------------------------------------------
# User profile / admin
# ---------------------------------------------------------------------------


class ProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    email: Optional[str] = None
    bio: Optional[str] = None
    organization: Optional[str] = None

    @field_validator("email")
    @classmethod
    def _email(cls, v: Optional[str]) -> Optional[str]:
        return validate_email(v) if v else v


class AdminUserUpdate(BaseModel):
    role: Optional[str] = Field(default=None, pattern=r"^(user|analyst|admin)$")
    active: Optional[bool] = None


# ---------------------------------------------------------------------------
# Queries / pipeline
# ---------------------------------------------------------------------------


class QueryRequest(BaseModel):
    text: str = Field(min_length=6, max_length=2000)
    dataset_ids: Optional[list[str]] = None
    params: Optional[dict[str, Any]] = None


class QueryUnderstanding(BaseModel):
    query_text: str
    location: Optional[str] = None
    location_key: Optional[str] = None
    bbox: Optional[dict] = None
    date_start: Optional[str] = None
    date_end: Optional[str] = None
    phenomenon: Optional[str] = None
    data_type: Optional[str] = None
    requested_analysis: Optional[str] = None
    analysis_type: str = "general"
    agent: str
    agent_confidence: float = 0.0
    confidence: float = 0.0
    explanation: list[str] = []
    raw_text: str = ""


class SaveAnalysisRequest(BaseModel):
    result_id: str
    name: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------


class MapPreferences(BaseModel):
    base_layer: str = "dark"
    show_labels: bool = True
    opacity: Optional[dict] = None


class NotificationPreferences(BaseModel):
    email_summary: bool = True
    job_updates: bool = True
    weekly_digest: bool = False
    # "New sign-in" security alert e-mails (login / MFA completion).
    security_alerts: bool = True


class UserSettingsUpdate(BaseModel):
    theme: Optional[str] = Field(default=None, pattern=r"^(dark|light)$")
    default_satellite_source: Optional[str] = None
    default_data_type: Optional[str] = None
    map_preferences: Optional[MapPreferences] = None
    notifications: Optional[NotificationPreferences] = None
    api_provider: Optional[str] = None
    api_key: Optional[str] = None
    language: Optional[str] = None


class ContactRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str
    subject: str = Field(max_length=200)
    message: str = Field(min_length=10, max_length=4000)

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return validate_email(v)