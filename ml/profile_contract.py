"""Model input contract v2. Numeric categories match the dataset preprocessing."""
import math
from typing import Literal
from pydantic import BaseModel, Field, validator

FEATURE_COLS = [
    "age", "gender", "study_hours_per_day", "social_media_hours", "netflix_hours",
    "part_time_job", "attendance_percentage", "sleep_hours", "diet_quality",
    "exercise_frequency", "parental_education_level", "internet_quality",
    "mental_health_rating", "extracurricular_participation",
]

class StudentAssessment(BaseModel):
    schemaVersion: Literal[2]
    age: int = Field(ge=15, le=100)
    gender: int = Field(ge=0, le=1)  # Female=0, Male=1; other categories use web fallback.
    study_hours_per_day: float = Field(ge=0, le=12)
    social_media_hours: float = Field(ge=0, le=12)
    netflix_hours: float = Field(ge=0, le=10)
    part_time_job: int = Field(ge=0, le=1)
    attendance_percentage: float = Field(ge=0, le=100)
    sleep_hours: float = Field(ge=0, le=12)
    diet_quality: int = Field(ge=0, le=3)
    exercise_frequency: int = Field(ge=0, le=7)
    parental_education_level: int = Field(ge=0, le=3)
    internet_quality: int = Field(ge=0, le=2)
    mental_health_rating: int = Field(ge=1, le=10)
    extracurricular_participation: int = Field(ge=0, le=1)

    @validator("*", pre=True)
    def finite_numeric(cls, value, field):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError("Every profile field must be a finite number")
        integer_fields = {"schemaVersion", "age", "gender", "part_time_job", "diet_quality", "exercise_frequency", "parental_education_level", "internet_quality", "mental_health_rating", "extracurricular_participation"}
        if field.name in integer_fields and value != int(value):
            raise ValueError("Category fields must be integers")
        return value
