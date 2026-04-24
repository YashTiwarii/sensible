from fastapi import APIRouter
from database import get_connection
from decimal import Decimal

router = APIRouter()

@router.get("")
def get_categories():
    conn = get_connection()
    try:
        rows = conn.execute("""
            SELECT 
                c.name,
                COALESCE(SUM(e.amount), 0) as total
            FROM categories c
            LEFT JOIN expenses e ON e.category = c.name
            GROUP BY c.name
            ORDER BY c.name
        """).fetchall()
        return [
            {
                "name": row["name"],
                "total": f"{Decimal(row['total']) / 100:.2f}"
            }
            for row in rows
        ]
    finally:
        conn.close()