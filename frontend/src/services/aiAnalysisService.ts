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
You are a professional stock analyst with expertise in both fundamental and technical analysis. Your task is to generate a concise, actionable, and trader-focused analysis of a stock, using only the data provided.
Do not invent, assume, or use external financial information not found in the provided data.
You can add any additional insights or analysis based on the data provided/about the company.

Organize your response into the following sections (in this order):

1. TOP-LINE SUMMARY
  - Briefly summarize the stock's current situation and outlook in 2–3 sentences.
  - Include company name, sector, and a key insight about its current market position.

2. TECHNICAL ANALYSIS
  - Analyze price trends, support/resistance levels, moving averages (50/200-day), and volume patterns.
  - Evaluate the stock's position relative to key moving averages (above/below, crossovers).
  - Identify chart patterns, momentum, and any notable divergences.
  - Calculate key levels: current support (recent lows), resistance (recent highs), and potential breakout points.
  - Compare current trading volume with averages and note significant deviations.

3. FUNDAMENTAL EVALUATION
  - Assess valuation metrics: P/E ratio, P/S, P/B, EV/EBITDA compared to industry averages if available.
  - Analyze growth metrics: revenue growth, earnings growth, margin expansion/contraction.
  - Evaluate financial health: debt levels, cash position, liquidity ratios.
  - Consider profitability metrics: profit margins, ROE, ROA.
  - Review analyst sentiment: consensus rating, price targets, and potential upside.
  - Examine ownership structure and short interest for sentiment indicators.

4. RISK ASSESSMENT
  - Identify key risks: financial, competitive, operational based on the data provided.
  - Note any concerning metrics or trends in the data.
  - Consider volatility indicators like beta and recent price action.

5. TRADING STRATEGY
  - Provide a clear recommendation: Buy, Sell, or Hold with confidence level (Strong or Moderate).
  - Suggest specific entry price range, stop-loss level, and price target based on technical and fundamental factors.
  - Indicate time horizon: short-term trade (days/weeks), medium-term position (months), or long-term investment (1+ years).
  - Outline 2-3 specific catalysts or signals that would validate or invalidate your thesis.

Formatting Rules:
- Use plain text only. DO NOT USE MARKDOWN, BOLD, OR SPECIAL FORMATTING. NO **, *, or any other markdown formatting.
- To emphasize, use indentation or spacing, not symbols.
- Be concise and AVOID REPETITION.
- Limit your response to approximately 600-800 words.

Instructions:
- Analyze strictly the data provided in the prompt.
- Focus on actionable insights for traders and investors.
- If data is missing for a section, state "Insufficient data for this section" rather than speculating.
- When recommending entry/exit points, use precise numbers based on technical and fundamental analysis.
- Make your analysis relevant to current market conditions as indicated by the data provided.
`;

    const response = await axios.post(
      `/api/stock-analysis`,
      {
        model: 'meta-llama/llama-4-maverick:free',
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
    n == null ? null : typeof n === 'number' ? (n >= 1e9 ? (n / 1e9).toFixed(2) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n.toFixed(2)) : String(n);

  const formatPct = (n: any) => 
    n == null ? null : typeof n === 'number' ? (n * 100).toFixed(2) + '%' : String(n);
    
  // Helper function to add a field only if it has a value
  const addField = (label: string, value: any): string => {
    return value ? `- ${label}: ${value}\n` : '';
  };

  const historySection = formatHistoricalData(stockHistory);

  let promptText = `

BASIC INFO:
`;

  // Basic Info
  promptText += addField('Symbol', info.symbol);
  promptText += addField('Name', info.longName || info.shortName);
  promptText += addField('Sector', info.sector);
  promptText += addField('Industry', info.industryDisp || info.industry);

  // Price Data
  promptText += `
PRICE DATA:
`;
  promptText += addField('Current Price', formatNum(info.currentPrice || info.regularMarketPrice) ? '$' + formatNum(info.currentPrice || info.regularMarketPrice) : null);
  promptText += addField('Previous Close', formatNum(info.previousClose || info.regularMarketPreviousClose) ? '$' + formatNum(info.previousClose || info.regularMarketPreviousClose) : null);
  promptText += addField('Open', formatNum(info.open || info.regularMarketOpen) ? '$' + formatNum(info.open || info.regularMarketOpen) : null);
  
  const dayLow = formatNum(info.dayLow || info.regularMarketDayLow);
  const dayHigh = formatNum(info.dayHigh || info.regularMarketDayHigh);
  if (dayLow && dayHigh) {
    promptText += addField('Day Range', '$' + dayLow + ' - $' + dayHigh);
  }
  
  const fiftyTwoWeekLow = formatNum(info.fiftyTwoWeekLow);
  const fiftyTwoWeekHigh = formatNum(info.fiftyTwoWeekHigh);
  if (fiftyTwoWeekLow && fiftyTwoWeekHigh) {
    promptText += addField('52-Week Range', '$' + fiftyTwoWeekLow + ' - $' + fiftyTwoWeekHigh);
  }
  
  promptText += addField('52-Week Change', formatPct(info['52WeekChange']));
  promptText += addField('S&P 52-Week Change', formatPct(info.SandP52WeekChange));
  promptText += addField('50-Day Moving Average', formatNum(info.fiftyDayAverage) ? '$' + formatNum(info.fiftyDayAverage) : null);
  promptText += addField('200-Day Moving Average', formatNum(info.twoHundredDayAverage) ? '$' + formatNum(info.twoHundredDayAverage) : null);
  promptText += addField('Volume', formatNum(info.volume || info.regularMarketVolume));
  promptText += addField('Avg Volume', formatNum(info.averageVolume));
  promptText += addField('Avg Volume (10 days)', formatNum(info.averageVolume10days));
  promptText += addField('Market State', info.marketState);

  // Fundamentals
  promptText += `
FUNDAMENTALS:
`;
  promptText += addField('Market Cap', formatNum(info.marketCap) ? '$' + formatNum(info.marketCap) : null);
  promptText += addField('Enterprise Value', formatNum(info.enterpriseValue) ? '$' + formatNum(info.enterpriseValue) : null);
  promptText += addField('P/E (TTM)', formatNum(info.trailingPE));
  promptText += addField('Forward P/E', formatNum(info.forwardPE));
  promptText += addField('PEG Ratio', formatNum(info.pegRatio));
  promptText += addField('Price to Sales (TTM)', formatNum(info.priceToSalesTrailing12Months));
  promptText += addField('Price to Book', formatNum(info.priceToBook));
  promptText += addField('Enterprise Value to Revenue', formatNum(info.enterpriseToRevenue));
  promptText += addField('Enterprise Value to EBITDA', formatNum(info.enterpriseToEbitda));
  promptText += addField('Trailing EPS', formatNum(info.trailingEps || info.epsTrailingTwelveMonths) ? '$' + formatNum(info.trailingEps || info.epsTrailingTwelveMonths) : null);
  promptText += addField('Forward EPS', formatNum(info.forwardEps || info.epsForward) ? '$' + formatNum(info.forwardEps || info.epsForward) : null);
  promptText += addField('EPS Current Year', formatNum(info.epsCurrentYear) ? '$' + formatNum(info.epsCurrentYear) : null);

  // Financial Health
  promptText += `
FINANCIAL HEALTH:
`;
  promptText += addField('Profit Margin', formatPct(info.profitMargins));
  promptText += addField('Operating Margin', formatPct(info.operatingMargins));
  promptText += addField('Gross Margin', formatPct(info.grossMargins));
  promptText += addField('EBITDA', formatNum(info.ebitda) ? '$' + formatNum(info.ebitda) : null);
  promptText += addField('EBITDA Margins', formatPct(info.ebitdaMargins));
  promptText += addField('Return on Assets', formatPct(info.returnOnAssets));
  promptText += addField('Return on Equity', formatPct(info.returnOnEquity));
  promptText += addField('Revenue', formatNum(info.totalRevenue) ? '$' + formatNum(info.totalRevenue) : null);
  promptText += addField('Revenue per Share', formatNum(info.revenuePerShare) ? '$' + formatNum(info.revenuePerShare) : null);
  promptText += addField('Revenue Growth', formatPct(info.revenueGrowth));
  promptText += addField('Earnings Growth', formatPct(info.earningsGrowth));
  promptText += addField('Quarterly Earnings Growth', formatPct(info.earningsQuarterlyGrowth));

  // Balance Sheet
  promptText += `
BALANCE SHEET:
`;
  promptText += addField('Total Cash', formatNum(info.totalCash) ? '$' + formatNum(info.totalCash) : null);
  promptText += addField('Total Cash per Share', formatNum(info.totalCashPerShare) ? '$' + formatNum(info.totalCashPerShare) : null);
  promptText += addField('Total Debt', formatNum(info.totalDebt) ? '$' + formatNum(info.totalDebt) : null);
  promptText += addField('Debt to Equity', formatNum(info.debtToEquity));
  promptText += addField('Current Ratio', formatNum(info.currentRatio));
  promptText += addField('Quick Ratio', formatNum(info.quickRatio));
  promptText += addField('Book Value per Share', formatNum(info.bookValue) ? '$' + formatNum(info.bookValue) : null);
  promptText += addField('Free Cash Flow', formatNum(info.freeCashflow) ? '$' + formatNum(info.freeCashflow) : null);
  promptText += addField('Operating Cash Flow', formatNum(info.operatingCashflow) ? '$' + formatNum(info.operatingCashflow) : null);

  // Only add the Dividends section if the stock pays dividends
  if (info.dividendRate || info.dividendYield || info.payoutRatio) {
    promptText += `
DIVIDENDS:
`;
    promptText += addField('Dividend Rate', formatNum(info.dividendRate) ? '$' + formatNum(info.dividendRate) : null);
    promptText += addField('Dividend Yield', formatPct(info.dividendYield));
    promptText += addField('Trailing Annual Dividend Rate', formatNum(info.trailingAnnualDividendRate) ? '$' + formatNum(info.trailingAnnualDividendRate) : null);
    promptText += addField('Trailing Annual Dividend Yield', formatPct(info.trailingAnnualDividendYield));
    promptText += addField('Payout Ratio', formatPct(info.payoutRatio));
    promptText += addField('Ex-Dividend Date', info.exDividendDate);
    promptText += addField('5 Year Avg Dividend Yield', formatNum(info.fiveYearAvgDividendYield));
  }

  // Ownership & Short Interest
  promptText += `
OWNERSHIP & SHORT INTEREST:
`;
  promptText += addField('Insider Ownership', formatPct(info.heldPercentInsiders));
  promptText += addField('Institutional Ownership', formatPct(info.heldPercentInstitutions));
  promptText += addField('Float Shares', formatNum(info.floatShares));
  promptText += addField('Shares Outstanding', formatNum(info.sharesOutstanding));
  promptText += addField('Implied Shares Outstanding', formatNum(info.impliedSharesOutstanding));
  promptText += addField('Shares Short', formatNum(info.sharesShort));
  promptText += addField('Shares Short (Prior Month)', formatNum(info.sharesShortPriorMonth));
  promptText += addField('Short % of Float', formatPct(info.shortPercentOfFloat));
  promptText += addField('Short % of Shares Outstanding', formatPct(info.sharesPercentSharesOut));
  promptText += addField('Short Ratio (Days to Cover)', formatNum(info.shortRatio));
  promptText += addField('Date of Short Interest', info.dateShortInterest ? new Date(info.dateShortInterest * 1000).toISOString().split('T')[0] : null);

  // Analyst Opinions
  promptText += `
ANALYST OPINIONS:
`;
  let analystRatingText = formatNum(info.recommendationMean);
  if (analystRatingText) analystRatingText += ' (1=Strong Buy, 5=Strong Sell)';
  promptText += addField('Analyst Rating Mean', analystRatingText);
  promptText += addField('Consensus Rating', info.averageAnalystRating);
  promptText += addField('Recommendation', info.recommendationKey ? info.recommendationKey.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : null);
  promptText += addField('Target Mean Price', formatNum(info.targetMeanPrice) ? '$' + formatNum(info.targetMeanPrice) : null);
  promptText += addField('Target Median Price', formatNum(info.targetMedianPrice) ? '$' + formatNum(info.targetMedianPrice) : null);
  promptText += addField('Target Low Price', formatNum(info.targetLowPrice) ? '$' + formatNum(info.targetLowPrice) : null);
  promptText += addField('Target High Price', formatNum(info.targetHighPrice) ? '$' + formatNum(info.targetHighPrice) : null);
  promptText += addField('Number of Analysts', info.numberOfAnalystOpinions);
  
  const upsidePotential = info.targetMeanPrice && info.currentPrice 
    ? ((info.targetMeanPrice / info.currentPrice - 1) * 100).toFixed(2) + '%' 
    : null;
  promptText += addField('Upside Potential', upsidePotential);

  // Technical Indicators
  promptText += `
TECHNICAL INDICATORS:
`;
  promptText += addField('Beta', formatNum(info.beta));
  
  const fiftyDayChange = info.fiftyDayAverageChange && info.fiftyDayAverage 
    ? ((info.fiftyDayAverageChange / info.fiftyDayAverage) * 100).toFixed(2) + '%' 
    : null;
  promptText += addField('50-Day MA % Change', fiftyDayChange);
  
  const twoHundredDayChange = info.twoHundredDayAverageChange && info.twoHundredDayAverage 
    ? ((info.twoHundredDayAverageChange / info.twoHundredDayAverage) * 100).toFixed(2) + '%' 
    : null;
  promptText += addField('200-Day MA % Change', twoHundredDayChange);

  // Risk Metrics
  if (info.auditRisk || info.boardRisk || info.overallRisk) {
    promptText += `
RISK METRICS:
`;
    promptText += addField('Audit Risk', formatNum(info.auditRisk));
    promptText += addField('Board Risk', formatNum(info.boardRisk));
    promptText += addField('Compensation Risk', formatNum(info.compensationRisk));
    promptText += addField('Shareholder Rights Risk', formatNum(info.shareHolderRightsRisk));
    promptText += addField('Overall Risk', formatNum(info.overallRisk));
  }

  // Add history section
  promptText += historySection;

  return promptText;
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
    `- ${h.date.split('T')[0]}: $${(h.open ?? 0).toFixed(2)} ➝ $${(h.close ?? 0).toFixed(2)}`
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

