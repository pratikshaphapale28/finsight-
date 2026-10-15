from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class TransactionItem(BaseModel):
    amount: float = Field(..., gt=0, description="Expense transaction amount")
    category: Optional[str] = "Other"
    date: str = Field(..., description="ISO date string or YYYY-MM-DD")

class PredictionRequest(BaseModel):
    user_id: Optional[str] = None
    transactions: List[TransactionItem]

class MonthlyExpenseSummary(BaseModel):
    month_key: str
    label: str
    year: int
    month: int
    total_amount: float
    transaction_count: int

class PredictionDetails(BaseModel):
    average_monthly: float
    last_month_expense: float
    trend_slope: float
    trend_direction: str
    r2_score: Optional[float] = None
    monthly_history: List[Dict[str, Any]]

class PredictionResponse(BaseModel):
    status: str
    predictedExpense: Optional[float] = None
    message: str
    historicalMonthsCount: int
    requiredMonths: int = 3
    trend: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class CategorizeRequest(BaseModel):
    text: str = Field(..., description="Transaction statement text to classify")

class CategorizeResponse(BaseModel):
    category: str
    confidence: float
    transaction_type: str = "expense"
    suggested_description: Optional[str] = None

