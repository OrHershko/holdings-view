import { AccountBalance, Bill, ChartData, MarketAsset, NavItem, PortfolioSummary, Reward, TimeFilter, TotalRewards, User } from '../types';

export const mockUser: User = {
  id: '1',
  name: 'Or',
  avatarUrl: 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=100',
  accountType: 'Personal account'
};

export const mockPortfolioSummary: PortfolioSummary = {
  totalValue: 779454.31,
  changePercentage: 2.34,
  changeAmount: 17886.27,
  isPositive: true
};

export const mockAccountBalances: AccountBalance[] = [
  {
    id: '1',
    name: 'Checking',
    balance: 322498.32,
    type: 'checking',
    apy: 0.05
  },
  {
    id: '2',
    name: 'Savings',
    balance: 322498.32,
    type: 'savings',
    apy: 3.75
  }
];

export const mockChartData: ChartData[] = [
  { time: '9am', value: 74000 },
  { time: '10am', value: 75200 },
  { time: '11am', value: 75400 },
  { time: '12pm', value: 76500 },
  { time: '1pm', value: 78000 },
  { time: '2pm', value: 80000 },
  { time: '3pm', value: 79000 },
  { time: '4pm', value: 81000 }
];

export const mockTimeFilters: TimeFilter[] = [
  { id: '1d', label: '1D' },
  { id: '1w', label: '1W' },
  { id: '1m', label: '1M' },
  { id: 'ytd', label: 'YTD' },
  { id: '1y', label: '1Y' },
  { id: '5y', label: '5Y' },
  { id: 'all', label: 'All' }
];

export const mockDailyBalance: {
  balance: number;
  date: string;
} = {
  balance: 151341.44,
  date: 'Today, 5:02 PM'
};

export const mockRewards: Reward[] = [
  { id: '1', name: 'Cash Rewards', amount: 3590.25, color: '#3B82F6' },
  { id: '2', name: 'Stock Rewards', amount: 1971.99, color: '#EC4899' },
  { id: '3', name: 'Crypto Rewards', amount: 1721.81, color: '#8B5CF6' },
  { id: '4', name: 'Lending Rewards', amount: 188.67, color: '#F59E0B' }
];

export const mockTotalRewards: TotalRewards = {
  total: 10000,
  earned: 6472.71
};

export const mockMarketAssets: MarketAsset[] = [
  {
    id: '1',
    name: 'Bitcoin',
    symbol: 'BTC',
    price: 63259.41,
    change: 0.87,
    isPositive: true,
    logoUrl: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png?v=026'
  },
  {
    id: '2',
    name: 'Ethereum',
    symbol: 'ETH',
    price: 3458.26,
    change: 1.42,
    isPositive: true,
    logoUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png?v=026'
  },
  {
    id: '3',
    name: 'Apple',
    symbol: 'AAPL',
    price: 184.42,
    change: -0.68,
    isPositive: false,
    logoUrl: 'https://companieslogo.com/img/orig/AAPL-bf1a4314.png?t=1632720960'
  },
  {
    id: '4',
    name: 'Tesla',
    symbol: 'TSLA',
    price: 238.72,
    change: -1.23,
    isPositive: false,
    logoUrl: 'https://companieslogo.com/img/orig/TSLA-10c28f85.png?t=1633073109'
  }
];

export const mockBills: Bill[] = [
  {
    id: '1',
    name: 'Rent',
    amount: 2500,
    dueDate: '2025-01-01',
    isPaid: false,
    logoUrl: 'https://cdn-icons-png.flaticon.com/512/25/25694.png'
  },
  {
    id: '2',
    name: 'Netflix',
    amount: 19.99,
    dueDate: '2025-01-05',
    isPaid: false,
    logoUrl: 'https://cdn4.iconfinder.com/data/icons/logos-and-brands/512/227_Netflix_logo-512.png'
  }
];

export const mockNavItems: NavItem[] = [
  { id: 'home', name: 'Home', icon: 'home', path: '/' },
  { id: 'cash', name: 'Cash', icon: 'wallet', path: '/cash' },
  { id: 'budgets', name: 'Budgets', icon: 'pie-chart', path: '/budgets' },
  { id: 'invest', name: 'Invest', icon: 'trending-up', path: '/invest' },
  { id: 'market', name: 'Market', icon: 'bar-chart-2', path: '/market' },
  { id: 'help', name: 'Help', icon: 'help-circle', path: '/help' },
  { id: 'theme', name: 'Theme', icon: 'moon', path: '/theme' }
];