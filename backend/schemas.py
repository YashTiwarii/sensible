from pydantic import BaseModel, field_validator
from decimal import Decimal
from datetime import date


class ExpenseCreate(BaseModel):
    amount: Decimal
    category: str
    description: str
    date: date

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v):
        if v <= 0:
            raise ValueError("Amount must be greater than zero")
        if round(v, 2) != v:
            raise ValueError("Amount cannot have more than 2 decimal places")
        return v

    @field_validator("category")
    @classmethod
    def category_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError("Category cannot be empty")
        return v.strip()

    @field_validator("description")
    @classmethod
    def description_must_not_be_empty(cls, v):
        if not v.strip():
            raise ValueError("Description cannot be empty")
        return v.strip()


class ExpenseResponse(BaseModel):
    id: int
    amount: Decimal
    category: str
    description: str
    date: str
    created_at: str

    @classmethod
    def from_row(cls, row):
        return cls(
            id=row["id"],
            amount=Decimal(row["amount"]) / 100,
            category=row["category"],
            description=row["description"],
            date=row["date"],
            created_at=row["created_at"]
        )


class CategoryResponse(BaseModel):
    name: str
    total: Decimal