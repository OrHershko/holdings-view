import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { 
  Building2Icon, GlobeIcon, PhoneIcon, BarChart3Icon, CalendarIcon,
  TrendingUpIcon, DollarSignIcon, UsersIcon, InfoIcon, FileTextIcon,
  BrainCircuitIcon
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useDetailedStockData } from '@/hooks/useDetailedStockData';
import { useStockHistory } from '@/hooks/useStockData';
import AIStockAnalysis from './AIStockAnalysis';

interface StockDetailedInfoProps {
  symbol: string;
  isOpen: boolean;
}

// Function to format numbers with commas for thousands
const formatNumber = (num: number | string | undefined) => {
  if (num === undefined || num === null || num === '') return 'N/A';
  if (typeof num === 'string' && !num.trim()) return 'N/A';
  
  if (typeof num === 'string') {
    // Try to convert to number
    num = parseFloat(num);
    if (isNaN(num)) return 'N/A';
  }
  
  // Format large numbers with appropriate suffixes (B for billions, M for millions, etc.)
  if (num >= 1e9) {
    return `$${(num / 1e9).toFixed(2)}B`;
  } else if (num >= 1e6) {
    return `$${(num / 1e6).toFixed(2)}M`;
  } else if (num >= 1e3) {
    return `$${(num / 1e3).toFixed(2)}K`;
  } else {
    return `$${num.toFixed(2)}`;
  }
};

// Format date from epoch
const formatDate = (epochTime: number | undefined) => {
  if (!epochTime) return 'N/A';
  return new Date(epochTime * 1000).toLocaleDateString();
};

const StockDetailedInfo: React.FC<StockDetailedInfoProps> = ({ symbol, isOpen }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();
  
  // Use the hook to fetch detailed stock data
  const { data, isLoading, error } = useDetailedStockData(symbol, isOpen);
  const stockInfo = data?.info || {}; // Provide empty object as fallback
  const stockHistory = data?.history || null; // Provide null as fallback
  
  // Show error toast if fetch fails
  useEffect(() => {
    if (error) {
      console.error('Error fetching stock details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load detailed stock information.',
        variant: 'destructive',
      });
    }
  }, [error, toast]);


  // Don't render if not open or there's no symbol
  if (!isOpen || !symbol) return null;

  // Handle error states more gracefully
  if (error) {
    return (
      <Card className="w-full mt-4 dark:bg-gray-900/90 backdrop-blur-sm border-gray-600">
        <CardContent className="py-4">
          <div className="flex flex-col items-center justify-center p-4">
            <p className="text-red-500 mb-2">Failed to load detailed stock information</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mt-4 dark:bg-gray-900/90 backdrop-blur-sm border-gray-600">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div>
            <span className="text-xl">{stockInfo?.shortName || stockInfo?.longName || symbol}</span>
            <Badge variant="outline" className="ml-2 text-xs font-normal">
              {stockInfo?.exchange || 'Unknown Exchange'}
            </Badge>
          </div>
          {stockInfo?.recommendationKey && (
            <Badge 
              className={`
                ${stockInfo.recommendationKey === 'buy' || stockInfo.recommendationKey === 'strong_buy' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : stockInfo.recommendationKey === 'hold' 
                  ? 'bg-yellow-600 hover:bg-yellow-700' 
                  : 'bg-red-600 hover:bg-red-700'}
                text-white
              `}
            >
              {stockInfo.recommendationKey
                .replace('_', ' ')
                .replace(/\b\w/g, c => c.toUpperCase())
              }
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : (
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-5 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="company">Company</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="ai-analysis" className="flex items-center">
                <BrainCircuitIcon className="h-4 w-4 mr-1" />
                AI Analysis
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px] pr-4">
              <TabsContent value="overview" className="space-y-4">
                {stockInfo?.longBusinessSummary && (
                  <div>
                    <h3 className="text-lg font-semibold flex items-center">
                      <FileTextIcon className="mr-2 h-5 w-5" />
                      Business Summary
                    </h3>
                    <p className="text-sm mt-2 leading-relaxed">{stockInfo.longBusinessSummary}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center">
                      <InfoIcon className="mr-2 h-5 w-5" />
                      Basic Information
                    </h3>
                    <ul className="space-y-2 mt-2">
                      <li className="flex justify-between">
                        <span className="text-gray-500">Symbol:</span>
                        <span className="font-medium">{stockInfo?.symbol || 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Currency:</span>
                        <span className="font-medium">{stockInfo?.currency || 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Market:</span>
                        <span className="font-medium">{stockInfo?.market?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Exchange:</span>
                        <span className="font-medium">{stockInfo?.exchange || 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Quote Type:</span>
                        <span className="font-medium">{stockInfo?.quoteType || 'N/A'}</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold flex items-center">
                      <BarChart3Icon className="mr-2 h-5 w-5" />
                      Trading Information
                    </h3>
                    <ul className="space-y-2 mt-2">
                      <li className="flex justify-between">
                        <span className="text-gray-500">Previous Close:</span>
                        <span className="font-medium">${stockInfo?.previousClose?.toFixed(2) || 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Open:</span>
                        <span className="font-medium">${stockInfo?.open?.toFixed(2) || 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Day Range:</span>
                        <span className="font-medium">
                          ${stockInfo?.dayLow?.toFixed(2) || 'N/A'} - ${stockInfo?.dayHigh?.toFixed(2) || 'N/A'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">52-Week Range:</span>
                        <span className="font-medium">
                          ${stockInfo?.fiftyTwoWeekLow?.toFixed(2) || 'N/A'} - ${stockInfo?.fiftyTwoWeekHigh?.toFixed(2) || 'N/A'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Volume:</span>
                        <span className="font-medium">{stockInfo?.volume?.toLocaleString() || 'N/A'}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="financial" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center">
                      <DollarSignIcon className="mr-2 h-5 w-5" />
                      Valuation
                    </h3>
                    <ul className="space-y-2 mt-2">
                      <li className="flex justify-between">
                        <span className="text-gray-500">Market Cap:</span>
                        <span className="font-medium">{formatNumber(stockInfo?.marketCap)}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Enterprise Value:</span>
                        <span className="font-medium">{formatNumber(stockInfo?.enterpriseValue)}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Trailing P/E:</span>
                        <span className="font-medium">{stockInfo?.trailingPE?.toFixed(2) || 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Forward P/E:</span>
                        <span className="font-medium">{stockInfo?.forwardPE?.toFixed(2) || 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Price/Book:</span>
                        <span className="font-medium">{stockInfo?.priceToBook?.toFixed(2) || 'N/A'}</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold flex items-center">
                      <TrendingUpIcon className="mr-2 h-5 w-5" />
                      Financial Metrics
                    </h3>
                    <ul className="space-y-2 mt-2">
                      <li className="flex justify-between">
                        <span className="text-gray-500">Revenue:</span>
                        <span className="font-medium">{formatNumber(stockInfo?.totalRevenue)}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Revenue Growth:</span>
                        <span className="font-medium">{stockInfo?.revenueGrowth ? (stockInfo.revenueGrowth * 100).toFixed(2) + '%' : 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Gross Margins:</span>
                        <span className="font-medium">{stockInfo?.grossMargins ? (stockInfo.grossMargins * 100).toFixed(2) + '%' : 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Operating Margins:</span>
                        <span className="font-medium">{stockInfo?.operatingMargins ? (stockInfo.operatingMargins * 100).toFixed(2) + '%' : 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Profit Margins:</span>
                        <span className="font-medium">{stockInfo?.profitMargins ? (stockInfo.profitMargins * 100).toFixed(2) + '%' : 'N/A'}</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <Separator className="my-4" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center">
                      <CalendarIcon className="mr-2 h-5 w-5" />
                      Dividends
                    </h3>
                    <ul className="space-y-2 mt-2">
                      <li className="flex justify-between">
                        <span className="text-gray-500">Dividend Rate:</span>
                        <span className="font-medium">{stockInfo?.dividendRate?.toFixed(2) || 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Dividend Yield:</span>
                        <span className="font-medium">{stockInfo?.dividendYield ? (stockInfo.dividendYield * 100).toFixed(2) + '%' : 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Ex-Dividend Date:</span>
                        <span className="font-medium">{formatDate(stockInfo?.exDividendDate)}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Payout Ratio:</span>
                        <span className="font-medium">{stockInfo?.payoutRatio ? (stockInfo.payoutRatio * 100).toFixed(2) + '%' : 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">5-Year Avg Dividend Yield:</span>
                        <span className="font-medium">{stockInfo?.fiveYearAvgDividendYield ? stockInfo.fiveYearAvgDividendYield.toFixed(2) + '%' : 'N/A'}</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold">Returns & Performance</h3>
                    <ul className="space-y-2 mt-2">
                      <li className="flex justify-between">
                        <span className="text-gray-500">Return on Equity:</span>
                        <span className="font-medium">{stockInfo?.returnOnEquity ? (stockInfo.returnOnEquity * 100).toFixed(2) + '%' : 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Return on Assets:</span>
                        <span className="font-medium">{stockInfo?.returnOnAssets ? (stockInfo.returnOnAssets * 100).toFixed(2) + '%' : 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">52-Week Change:</span>
                        <span className={`font-medium ${stockInfo?.['52WeekChange'] >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {stockInfo?.['52WeekChange'] ? (stockInfo['52WeekChange'] * 100).toFixed(2) + '%' : 'N/A'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">S&P 52-Week Change:</span>
                        <span className={`font-medium ${stockInfo?.SandP52WeekChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {stockInfo?.SandP52WeekChange ? (stockInfo.SandP52WeekChange * 100).toFixed(2) + '%' : 'N/A'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Beta:</span>
                        <span className="font-medium">{stockInfo?.beta?.toFixed(2) || 'N/A'}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="company" className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center">
                    <Building2Icon className="mr-2 h-5 w-5" />
                    Company Information
                  </h3>
                  <ul className="space-y-2 mt-2">
                    <li className="flex justify-between">
                      <span className="text-gray-500">Industry:</span>
                      <span className="font-medium">{stockInfo?.industry || 'N/A'}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-500">Sector:</span>
                      <span className="font-medium">{stockInfo?.sector || 'N/A'}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-500">Full-Time Employees:</span>
                      <span className="font-medium">{stockInfo?.fullTimeEmployees?.toLocaleString() || 'N/A'}</span>
                    </li>
                  </ul>
                </div>
                
                <Separator className="my-4" />
                
                <div>
                  <h3 className="text-lg font-semibold flex items-center">
                    <GlobeIcon className="mr-2 h-5 w-5" />
                    Contact Information
                  </h3>
                  <ul className="space-y-2 mt-2">
                    <li className="flex justify-between">
                      <span className="text-gray-500">Address:</span>
                      <span className="font-medium text-right">
                        {stockInfo?.address1}{stockInfo?.city ? `, ${stockInfo.city}` : ''}{stockInfo?.state ? `, ${stockInfo.state}` : ''}{stockInfo?.zip ? ` ${stockInfo.zip}` : ''}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-500">Country:</span>
                      <span className="font-medium">{stockInfo?.country || 'N/A'}</span>
                    </li>
                    <li className="flex justify-between items-center">
                      <span className="text-gray-500">Phone:</span>
                      <span className="font-medium flex items-center">
                        <PhoneIcon className="h-4 w-4 mr-1" />
                        {stockInfo?.phone || 'N/A'}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-500">Website:</span>
                      <a 
                        href={stockInfo?.website} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="font-medium text-blue-500 hover:underline"
                      >
                        {stockInfo?.website || 'N/A'}
                      </a>
                    </li>
                  </ul>
                </div>
                
                {stockInfo?.companyOfficers && stockInfo.companyOfficers.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    
                    <div>
                      <h3 className="text-lg font-semibold flex items-center">
                        <UsersIcon className="mr-2 h-5 w-5" />
                        Key Executives
                      </h3>
                      <div className="mt-2 space-y-4">
                        {stockInfo.companyOfficers.slice(0, 5).map((officer: any, index: number) => (
                          <div key={index} className="border-l-2 border-gray-600 pl-4 py-1">
                            <p className="font-semibold">{officer.name || 'N/A'}</p>
                            <p className="text-sm text-gray-500">{officer.title || 'N/A'}</p>
                            {officer.totalPay && (
                              <p className="text-xs text-gray-400">
                                Compensation: ${officer.totalPay.toLocaleString()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="analysis" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-lg font-semibold">Analyst Recommendations</h3>
                    <ul className="space-y-2 mt-2">
                      <li className="flex justify-between">
                        <span className="text-gray-500">Recommendation:</span>
                        <Badge 
                          variant="outline" 
                          className={`
                            ${stockInfo?.recommendationKey === 'buy' || stockInfo?.recommendationKey === 'strong_buy' 
                              ? 'border-green-500 text-green-500' 
                              : stockInfo?.recommendationKey === 'hold' 
                              ? 'border-yellow-500 text-yellow-500' 
                              : 'border-red-500 text-red-500'}
                          `}
                        >
                          {stockInfo?.recommendationKey?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'N/A'}
                        </Badge>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Mean Recommendation:</span>
                        <span className="font-medium">{stockInfo?.recommendationMean?.toFixed(2) || 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Number of Analysts:</span>
                        <span className="font-medium">{stockInfo?.numberOfAnalystOpinions || 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Target Mean Price:</span>
                        <span className="font-medium">${stockInfo?.targetMeanPrice?.toFixed(2) || 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Target High Price:</span>
                        <span className="font-medium">${stockInfo?.targetHighPrice?.toFixed(2) || 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Target Low Price:</span>
                        <span className="font-medium">${stockInfo?.targetLowPrice?.toFixed(2) || 'N/A'}</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold">Earnings & Growth</h3>
                    <ul className="space-y-2 mt-2">
                      <li className="flex justify-between">
                        <span className="text-gray-500">Earnings Quarterly Growth:</span>
                        <span className="font-medium">
                          {stockInfo?.earningsQuarterlyGrowth 
                            ? (stockInfo.earningsQuarterlyGrowth * 100).toFixed(2) + '%' 
                            : 'N/A'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Earnings Growth:</span>
                        <span className="font-medium">
                          {stockInfo?.earningsGrowth 
                            ? (stockInfo.earningsGrowth * 100).toFixed(2) + '%' 
                            : 'N/A'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Trailing EPS:</span>
                        <span className="font-medium">${stockInfo?.trailingEps?.toFixed(2) || 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Forward EPS:</span>
                        <span className="font-medium">${stockInfo?.forwardEps?.toFixed(2) || 'N/A'}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-500">Next Earnings Date:</span>
                        <span className="font-medium">{formatDate(stockInfo?.earningsTimestamp)}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="ai-analysis">
                <AIStockAnalysis stockData={stockInfo} stockHistory={stockHistory} symbol={symbol} />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default StockDetailedInfo;
