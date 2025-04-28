import axios from 'axios';

/**
 * Response from AI stock analysis service
 */
export interface AIAnalysisResponse {
  analysis: string;
  error?: string;
}

/**
 * Get AI-generated technical and fundamental stock analysis
 */
export const getStockAnalysis = async (stockData: any, stockHistory?: any): Promise<AIAnalysisResponse> => {
  try {
    console.log('getStockAnalysis called', {
      hasStockData: !!stockData,
      hasStockHistory: !!stockHistory,
    });

    const prompt = createAnalysisPrompt(stockData, stockHistory);
    
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'deepseek/deepseek-r1:free',
        messages: [
          {
            role: 'system',
            content: `
You are a professional stock analyst writing concise, trader-oriented stock analysis. 
Use ONLY the provided data — do not invent data. 
Organize sections: TOP-LINE SUMMARY, TECHNICAL ANALYSIS, FUNDAMENTAL SNAPSHOT, TRADING STRATEGY.
Use plain text only. No ** for bold, no markdown. 
If you need to highlight something, use indentation. 
Example for BAD: **Support levels**.
Example for GOOD: Support levels.
Around 500 words.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 1500,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://holdings-view.vercel.app',
          'X-Title': 'Holdings View Stock Analysis',
        },
      }
    );

    const analysisText = response.data?.choices?.[0]?.message?.content || 'No analysis generated.';
    return { analysis: analysisText };
  } catch (error) {
    console.error('getStockAnalysis error:', error);
    return { analysis: '', error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Create structured prompt for AI based on stock data
 */
function createAnalysisPrompt(stockData: any, stockHistory?: any): string {
  const info = stockData || {};

  const formatNum = (n: any) => 
    n == null ? 'N/A' : typeof n === 'number' ? (n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n.toFixed(2)) : String(n);

  const formatPct = (n: any) => 
    n == null ? 'N/A' : typeof n === 'number' ? (n * 100).toFixed(2) + '%' : String(n);

  const historySection = formatHistoricalData(stockHistory);

  return `
BASIC INFO:
- Symbol: ${info.symbol || 'N/A'}
- Sector: ${info.sector || 'N/A'}
- Industry: ${info.industry || 'N/A'}

PRICE DATA:
- Current: $${formatNum(info.currentPrice)}
- Previous Close: $${formatNum(info.previousClose)}
- Day Range: $${formatNum(info.dayLow)}-$${formatNum(info.dayHigh)}
- 52-Week Range: $${formatNum(info.fiftyTwoWeekLow)}-$${formatNum(info.fiftyTwoWeekHigh)}
- 50-Day MA: $${formatNum(info.fiftyDayAverage)}
- 200-Day MA: $${formatNum(info.twoHundredDayAverage)}
- Volume: ${formatNum(info.volume)} vs Avg: ${formatNum(info.averageVolume)}

VALUATION:
- Market Cap: $${formatNum(info.marketCap)}
- P/E (Trailing/Fwd): ${formatNum(info.trailingPE)}/${formatNum(info.forwardPE)}
- PEG Ratio: ${formatNum(info.pegRatio)}
- Price/Book: ${formatNum(info.priceToBook)}
- Price/Sales: ${formatNum(info.priceToSalesTrailing12Months)}

FINANCIALS:
- Revenue: $${formatNum(info.totalRevenue)}
- Revenue Growth: ${formatPct(info.revenueGrowth)}
- Profit Margin: ${formatPct(info.profitMargins)}
- Operating Margin: ${formatPct(info.operatingMargins)}
- ROE: ${formatPct(info.returnOnEquity)}
- Earnings Growth: ${formatPct(info.earningsGrowth)}

DIVIDENDS:
- Yield: ${formatPct(info.dividendYield)}
- Payout Ratio: ${formatPct(info.payoutRatio)}

ANALYST OPINIONS:
- Analyst Rating Mean: ${formatNum(info.recommendationMean)} (1=Strong Buy, 5=Strong Sell)
- Consensus: ${info.recommendationKey ? info.recommendationKey.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'N/A'}
- Target Price: $${formatNum(info.targetMeanPrice)} (Range: $${formatNum(info.targetLowPrice)} - $${formatNum(info.targetHighPrice)})
- Number of Analysts: ${info.numberOfAnalystOpinions || 'N/A'}

TECHNICAL INDICATORS:
- Beta: ${formatNum(info.beta)}
- Institutional Ownership: ${formatPct(info.heldPercentInstitutions)}
- Short Ratio: ${formatNum(info.shortRatio)}

${historySection}

INSTRUCTIONS:
Analyze strictly the given data. Focus on trading signals, support/resistance levels, moving averages, and volume trends. 
Recommend Buy/Sell/Hold including entry, stop-loss, and target price if possible.
`;
}

/**
 * Format historical price data for inclusion in AI prompt
 */
function formatHistoricalData(historyData: any): string {
  if (!historyData) return 'No historical data available.';

  const history = extractHistoryArray(historyData);
  if (!history || history.length === 0) return 'No historical data available.';

  const latest = history.at(-1) || {};
  const weekAgo = history.at(-6) || latest;
  const changePct = weekAgo.close ? (((latest.close - weekAgo.close) / weekAgo.close) * 100).toFixed(2) : '0';

  const high = Math.max(...history.map((h: any) => h.high ?? 0));
  const low = Math.min(...history.map((h: any) => h.low ?? 0));
  const avgVolume = history.map((h: any) => h.volume ?? 0).reduce((a: number, b: number) => a + b, 0) / (history.length || 1);
  const volumeChange = latest.volume && avgVolume ? (((latest.volume - avgVolume) / avgVolume) * 100).toFixed(2) : '0';

  const recentCloses = history.map((h: any) => 
    `- ${h.date.split('T')[0]}: Open $${(h.open ?? 0).toFixed(2)} / Close $${(h.close ?? 0).toFixed(2)}`
  ).join('\n');

  return `
PRICE HISTORY DATA (Last 30 Days):
- Weekly Change: ${changePct}% (${latest.close >= weekAgo.close ? 'Up' : 'Down'})
- 30-Day High: $${high.toFixed(2)}
- 30-Day Low: $${low.toFixed(2)}
- Volume vs Average: ${volumeChange}% 
RECENT OPENS AND CLOSES:
${recentCloses}
`;
}

/**
 * Extract historical price array from various possible formats
 */
const extractHistoryArray = (historyData: any): any[] | null => {
  if (!historyData) return null;

  if (Array.isArray(historyData)) {
    console.log('historyData is directly an array (array of objects)');
    return historyData.map(item => ({
      date: (item.Date || item.date || '').split('T')[0],
      open: item.Open ?? item.open ?? null,
      high: item.High ?? item.high ?? null,
      low: item.Low ?? item.low ?? null,
      close: item.Close ?? item.close ?? null,
      volume: item.Volume ?? item.volume ?? null,
    }));
  }

  if (historyData.Open && typeof historyData.Open === 'object') {
    console.log('Found yfinance dataframe style');
    const dates = Object.keys(historyData.Open);
    return dates.map(dateStr => ({
      date: (dateStr || '').split('T')[0],
      open: historyData.Open[dateStr],
      high: historyData.High?.[dateStr],
      low: historyData.Low?.[dateStr],
      close: historyData.Close?.[dateStr],
      volume: historyData.Volume?.[dateStr] ?? null,
    }));
  }

  if (historyData.history && Array.isArray(historyData.history)) {
    console.log('Found history inside .history array');
    return historyData.history.map(item => ({
      date: (item.Date || item.date || '').split('T')[0],
      open: item.Open ?? item.open ?? null,
      high: item.High ?? item.high ?? null,
      low: item.Low ?? item.low ?? null,
      close: item.Close ?? item.close ?? null,
      volume: item.Volume ?? item.volume ?? null,
    }));
  }

  console.warn('Unrecognized history data format:', historyData);
  return null;
};

