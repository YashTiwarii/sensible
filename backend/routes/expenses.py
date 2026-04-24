from fastapi import APIRouter, Header, HTTPException
from typing import Optional
from decimal import Decimal
import sqlite3

from database import get_connection
from schemas import ExpenseCreate, ExpenseResponse

router = APIRouter()

@router.post("", status_code=201)
def create_expense(
    expense: ExpenseCreate,
    idempotency_key: str = Header(..., alias="Idempotency-Key")
):
    amount_paise = int(expense.amount * 100)
    conn = get_connection()
    try:
        # Insert or ignore if idempotency key already exists
        conn.execute("""
            INSERT OR IGNORE INTO expenses 
            (idempotency_key, amount, category, description, date)
            VALUES (?, ?, ?, ?, ?)
        """, (
            idempotency_key,
            amount_paise,
            expense.category,
            expense.description,
            str(expense.date)
        ))
        conn.commit()

        # Always return the row for this idempotency key
        row = conn.execute("""
            SELECT * FROM expenses WHERE idempotency_key = ?
        """, (idempotency_key,)).fetchone()

        # If category is new, add to categories table
        conn.execute(
            "INSERT OR IGNORE INTO categories (name) VALUES (?)",
            (expense.category,)
        )
        conn.commit()

        return ExpenseResponse.from_row(row)
    except sqlite3.IntegrityError as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        conn.close()


@router.get("")
def get_expenses(
    category: Optional[str] = None,
    sort: Optional[str] = "date_desc",
    limit: int = 20,
    offset: int = 0
):
    conn = get_connection()
    try:
        query = "SELECT * FROM expenses WHERE 1=1"
        params = []

        if category:
            query += " AND category = ?"
            params.append(category)

        if sort == "date_desc":
            query += " ORDER BY date DESC, created_at DESC"
        else:
            query += " ORDER BY date ASC, created_at ASC"

        # Get total count for pagination metadata
        count_row = conn.execute(
            f"SELECT COUNT(*) as cnt FROM expenses WHERE 1=1" +
            (" AND category = ?" if category else ""),
            params
        ).fetchone()

        query += " LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        rows = conn.execute(query, params).fetchall()

        # Compute total amount for current filter
        total_query = "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE 1=1"
        total_params = []
        if category:
            total_query += " AND category = ?"
            total_params.append(category)

        total_row = conn.execute(total_query, total_params).fetchone()
        total_amount = f"{Decimal(total_row['total']) / 100:.2f}"

        return {
            "expenses": [ExpenseResponse.from_row(r) for r in rows],
            "total": f"{Decimal(total_row['total']) / 100:.2f}",
            "count": count_row["cnt"],
            "limit": limit,
            "offset": offset
        }
    finally:
        conn.close()