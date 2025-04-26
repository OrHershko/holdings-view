export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
  type?: string;
  preMarketPrice: number;
  postMarketPrice: number;
  marketState?: string;
}

export interface PortfolioHolding {
  position: number;
  symbol: string;
  name: string;
  shares: number;
  averageCost: number;
  currentPrice: number;
  change: number;
  changePercent: number;
  value: number;
  gain: number;
  gainPercent: number;
  type: 'stock' | 'etf' | 'crypto' | 'cash';
  preMarketPrice: number;
  postMarketPrice: number;
  marketState?: string;
}

export interface PortfolioSummary {
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

export interface StockHistoryData {
  dates: string[];
  prices: number[];
  volume?: number[];
  high?: number[];
  low?: number[];
  open?: number[];
  close?: number[];
  sma20?: number[];
  sma50?: number[];
  sma100?: number[];
  sma150?: number[];
  sma200?: number[];
  rsi?: number[];
  macd?: number[];
  signal?: number[];
  histogram?: number[];
}

export interface NewsArticle {
  title: string;
  link: string;
  source: string;
  published: string;
}

export interface PortfolioData {
  holdings: PortfolioHolding[];
  summary: PortfolioSummary;
}
