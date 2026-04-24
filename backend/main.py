from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from routes import categories

app = FastAPI(title="Expense Tracker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

#app.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
app.include_router(categories.router, prefix="/categories", tags=["categories"])