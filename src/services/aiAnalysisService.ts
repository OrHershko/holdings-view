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
export const getStockAnalysis = async (
  stockData: any,
  stockHistory?: any,
  language: 'en' | 'he' = 'en'
): Promise<AIAnalysisResponse> => {
  try {
    console.log('getStockAnalysis called', {
      hasStockData: !!stockData,
      hasStockHistory: !!stockHistory,
      language,
    });

    const prompt = createAnalysisPrompt(stockData, stockHistory);
    
    const languageInstruction = language === 'he'
      ? 'Respond ONLY in Hebrew. Do not use English at all unless its a technical term/name. Translate all section headers and your entire response to Hebrew.'
      : 'Respond in English.';

    const systemPrompt = `
${languageInstruction}
You are a professional stock analyst. Your task is to generate a concise, actionable, and trader-focused analysis of a stock, using only the data provided.
Do not invent or assume any data.
Organize your response into the following sections (in this order):

1. TOP-LINE SUMMARY
  - Briefly summarize the stock's current situation and outlook in 2–3 sentences.

2. TECHNICAL ANALYSIS
  - Discuss price trends, support and resistance levels, moving averages, and volume patterns.
  - Highlight any notable technical signals (e.g., breakouts, crossovers, overbought/oversold conditions).
  - Reference specific data points from the provided information.

3. FUNDAMENTAL SNAPSHOT
  - Summarize key financial metrics (valuation, growth, profitability, analyst ratings, etc.).
  - Note any strengths, weaknesses, or red flags visible in the data.

4. TRADING STRATEGY
  - Provide a clear recommendation: Buy, Sell, or Hold.
  - If possible, suggest entry price, stop-loss, and target price, based on the data.
  - Justify your recommendation with reference to both technical and fundamental factors.

Formatting Rules:
- Use plain text only. DO NOT USE MARKDOWN, BOLD, OR SPECIAL FORMATTING. NO **, *, or any other markdown formatting.
- To emphasize, use indentation or spacing, not symbols.
- Be concise and avoid repetition.
- Limit your response to approximately 500 words.

Instructions:
- Analyze strictly the data provided.
- Focus on actionable insights for traders.
- If data is missing for a section, state "Insufficient data for this section."
- Do not speculate or use external knowledge.
`;

    const response = await axios.post(
      `${import.meta.env.VITE_API_BASE_URL}/stock-analysis`,
      {
        model: 'deepseek/deepseek-r1:free',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 1500,
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
Below is all the data available for this stock. If a value is 'N/A', the data is missing. Do not use any information not shown here.

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

