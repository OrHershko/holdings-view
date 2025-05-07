import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BrainCircuitIcon, RefreshCwIcon, AlertCircleIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { getStockAnalysis } from '@/services/aiAnalysisService';

interface AIStockAnalysisProps {
  stockData: any;
  stockHistory?: any;
  symbol: string;
}

const AIStockAnalysis: React.FC<AIStockAnalysisProps> = ({ stockData, stockHistory, symbol }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'he'>('en');
  const { toast } = useToast();

  const fetchAnalysis = async () => {
    if (!stockData) {
      setError('No stock data available.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getStockAnalysis(stockData, stockHistory, language);
      if (result.error) {
        setError(result.error);
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      } else {
        setAnalysis(result.analysis);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatAnalysis = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');

    return lines.map((line, idx) => {
      if (line.trim() === '') return <br key={idx} />;
      if (line.includes(':') && line === line.toUpperCase()) {
        return <h3 key={idx} className="text-lg font-bold mt-4 mb-2">{line}</h3>;
      }
      if (line.startsWith('- ')) {
        return <li key={idx} className="ml-4">{line.slice(2)}</li>;
      }
      return <p key={idx}>{line}</p>;
    });
  };

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
        <div className="text-xl flex items-center font-semibold min-w-0">
          <BrainCircuitIcon className="mr-2 h-5 w-5 flex-shrink-0" />
          <span className="truncate">AI Stock Analysis</span>
        </div>
        <div className="flex items-center space-x-2 self-end sm:self-center">
          <select
            value={language}
            onChange={e => setLanguage(e.target.value as 'en' | 'he')}
            className="border rounded px-2 py-1 text-sm bg-background dark:bg-gray-800"
            aria-label="Select analysis language"
          >
            <option value="en">English</option>
            <option value="he">עברית</option>
          </select>
          {!isLoading && (
            <Button 
              onClick={fetchAnalysis} 
              variant={analysis ? 'outline' : 'default'}
              size="sm"
            >
              {analysis ? <RefreshCwIcon className="h-4 w-4 mr-2" /> : <BrainCircuitIcon className="h-4 w-4 mr-2" />}
              {analysis ? 'Refresh' : 'Analyze'}
            </Button>
          )}
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-3 mt-4">
          {[...Array(8)].map((_, idx) => <Skeleton key={idx} className="h-4 w-full" />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center text-center p-4 mt-4">
          <AlertCircleIcon className="h-10 w-10 text-red-500 mb-2" />
          <p className="text-red-500">{error}</p>
          <Button 
            onClick={fetchAnalysis}
            variant="outline"
            className="mt-3"
            size="sm"
          >
            Try Again
          </Button>
        </div>
      ) : analysis ? (
        <div
          className={`space-y-2 mt-4 leading-relaxed${language === 'he' ? ' text-right' : ''}`}
          dir={language === 'he' ? 'rtl' : 'ltr'}
          style={{ paddingRight: 8 }}
        >
          {formatAnalysis(analysis)}
        </div>
      ) : (
        <div className="text-center p-8 text-gray-500 mt-4">
          <BrainCircuitIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>Generate an AI-powered analysis based on stock data and price history.</p>
        </div>
      )}
    </div>
  );
};

export default AIStockAnalysis;
