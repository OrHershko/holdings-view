import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Assuming you have a Button component

interface NewsArticle {
  title: string;
  link: string;
  source: string;
  published: string;
}

interface MarketOverviewProps {
  portfolio: string[];
}

const ARTICLES_PER_PAGE = 5;

const MarketOverview: React.FC<MarketOverviewProps> = ({ portfolio }) => {
  const [news, setNews] = useState<{ [symbol: string]: NewsArticle[] }>({});
  const [allNews, setAllNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchNews = async (symbol: string) => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://holdings-view.vercel.app/api';
        const response = await fetch(`${API_BASE_URL}/news/${symbol}`);
        if (!response.ok) {
          throw new Error('Failed to fetch news');
        }
        
        let data;
        try {
          data = await response.json();
          
          // Validate that the response is an array
          if (!Array.isArray(data)) {
            console.error(`News data for ${symbol} is not an array:`, data);
            data = []; // Set to empty array if not an array
          }
        } catch (parseError) {
          console.error(`Error parsing news data for ${symbol}:`, parseError);
          data = []; // Set to empty array on parse error
        }
        
        // Safely slice the array (now we know it's definitely an array)
        const limitedData = data.slice(0, 5); // Limit to 5 articles per symbol
        
        setNews(prev => ({ ...prev, [symbol]: limitedData }));
      } catch (error) {
        console.error(`Error fetching news for ${symbol}:`, error);
        setNews(prev => ({ ...prev, [symbol]: [] })); // Set empty array on error
      }
    };

    if (portfolio.length > 0) {
      setLoading(true);
      Promise.all(portfolio.map(symbol => fetchNews(symbol)))
        .finally(() => setLoading(false));
    } else {
      setNews({});
      setLoading(false);
    }
  }, [portfolio]);

  // Combine news from all symbols into a single array
  useEffect(() => {
    const combinedNews: NewsArticle[] = [];
    Object.values(news).forEach(articles => {
      if (Array.isArray(articles)) {
        combinedNews.push(...articles);
      }
    });
    setAllNews(combinedNews);
  }, [news]);

  // Pagination calculations
  const totalPages = Math.ceil(allNews.length / ARTICLES_PER_PAGE);
  const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
  const endIndex = startIndex + ARTICLES_PER_PAGE;
  
  // Make sure we're using the allNews array and double-check it's an array before slicing
  const currentNews = Array.isArray(allNews) 
    ? allNews.slice(startIndex, Math.min(endIndex, allNews.length)) 
    : [];

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (loading) {
    return (
      <Card className="ios-card">
        <CardContent className="p-4">
          <h2 className="text-lg font-medium">Loading News...</h2>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="ios-card">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Portfolio News</h2>
          {totalPages > 1 && (
             <span className="text-xs text-ios-gray">
               Page {currentPage} of {totalPages}
             </span>
          )}
        </div>

        {(!allNews || allNews.length === 0) ? (
          <p className="text-sm text-ios-gray text-center py-4">No news available for your portfolio.</p>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {currentNews.map((article, index) => (
                <div
                  key={`${article.link || 'no-link'}-${index}`} // Added fallback for key
                  className="flex justify-between items-start py-2 border-b border-ios-light-gray last:border-0"
                >
                  <div>
                    <a
                      href={article.link || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-ios-blue hover:underline text-sm" // Adjusted text size
                    >
                      {article.title || 'No title available'}
                    </a>
                    <p className="text-xs text-ios-gray mt-1">{article.source || 'Unknown source'}</p>
                    <p className="text-xs text-ios-gray">{article.published || ''}</p>
                  </div>
                  <a href={article.link || '#'} target="_blank" rel="noopener noreferrer">
                     <ArrowUpRight className="h-4 w-4 text-ios-blue flex-shrink-0 ml-2" />
                  </a>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="text-xs"
                >
                  <ChevronLeft className="h-3 w-3 mr-1" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="text-xs"
                >
                  Next
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MarketOverview;