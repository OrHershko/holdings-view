from typing import Dict, List, Optional, Union
from pydantic import BaseModel

class HoldingCreate(BaseModel):
    symbol: str
    shares: float
    averageCost: float

class HoldingResponse(HoldingCreate):
    name: Optional[str] = None
    currentPrice: Optional[float] = None
    change: Optional[float] = None
    changePercent: Optional[float] = None
    value: Optional[float] = None
    gain: Optional[float] = None
    gainPercent: Optional[float] = None
    type: Optional[str] = None
    preMarketPrice: Optional[float] = None
    postMarketPrice: Optional[float] = None
    marketState: Optional[str] = None

class PortfolioSummary(BaseModel):
    totalValue: float
    totalGain: float
    totalGainPercent: float
    dayChange: float
    dayChangePercent: float

class StockData(BaseModel):
    symbol: str
    name: Optional[str] = None
    price: float
    change: float
    changePercent: float
    marketCap: Optional[float] = None
    volume: Optional[float] = None
    type: Optional[str] = None
    preMarketPrice: Optional[float] = None
    postMarketPrice: Optional[float] = None
    marketState: Optional[str] = None

class StockHistoryData(BaseModel):
    dates: List[str]
    prices: List[float]
    volume: List[float]
    high: List[float]
    low: List[float]
    open: List[float]
    close: List[float]
    preMarketPrice: Optional[float] = None
    postMarketPrice: Optional[float] = None

class NewsArticle(BaseModel):
    title: str
    link: str
    source: str
    published: str

class ReorderRequest(BaseModel):
    orderedSymbols: List[str]

class WatchlistItemResponse(BaseModel):
    symbol: str
    name: Optional[str] = None
    price: Optional[float] = None
    change: Optional[float] = None
    changePercent: Optional[float] = None
    preMarketPrice: Optional[float] = None
    marketState: Optional[str] = None

class StockResponse(BaseModel):
    symbol: str
    price: float
    name: Optional[str] = None
    change: Optional[float] = None
    changePercent: Optional[float] = None
    marketCap: Optional[float] = None
    volume: Optional[int] = None
    type: Optional[str] = None
    marketState: Optional[str] = None
    preMarketPrice: Optional[float] = None
    postMarketPrice: Optional[float] = None
    marketState: Optional[str] = None
    
class HistoryResponse(BaseModel):
    symbol: str
    history: List[Dict]
    period: str
    interval: str
    adjusted: Optional[bool] = None
    requestedPeriod: Optional[str] = None
    actualPeriod: Optional[str] = None
    message: Optional[str] = None
    sma: Optional[Dict[str, List[Union[float, None]]]] = None
    type: Optional[str] = None
    marketState: Optional[str] = None

class SearchResponse(BaseModel):
    results: List[dict]
