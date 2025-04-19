export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  volume: number;
}

export interface PortfolioHolding {
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
  rsi?: number[];
  macd?: number[];
  signal?: number[];
  histogram?: number[];
}
