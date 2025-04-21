export interface User {
    id: string;
    name: string;
    avatarUrl: string;
    accountType: string;
  }
  
  export interface PortfolioSummary {
    totalValue: number;
    changePercentage: number;
    changeAmount: number;
    isPositive: boolean;
  }
  
  export interface AccountBalance {
    id: string;
    name: string;
    balance: number;
    type: 'checking' | 'savings' | 'investment' | 'crypto';
    apy: number;
  }
  
  export interface ChartData {
    time: string;
    value: number;
  }
  
  export interface TimeFilter {
    id: string;
    label: string;
  }
  
  export interface Reward {
    id: string;
    name: string;
    amount: number;
    color: string;
  }
  
  export interface TotalRewards {
    total: number;
    earned: number;
  }
  
  export interface MarketAsset {
    id: string;
    name: string;
    symbol: string;
    price: number;
    change: number;
    isPositive: boolean;
    logoUrl: string;
  }
  
  export interface Bill {
    id: string;
    name: string;
    amount: number;
    dueDate: string;
    isPaid: boolean;
    logoUrl: string;
  }
  
  export interface NavItem {
    id: string;
    name: string;
    icon: string;
    path: string;
  }