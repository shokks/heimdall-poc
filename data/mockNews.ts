// Mock news data for Portfolio Intelligence POC
// Contains 20+ realistic financial news items covering various stock symbols

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  timestamp: string;
  relatedSymbols: string[];
  impact: 'positive' | 'negative' | 'neutral';
  source: string;
  url: string;
}

export const mockNewsData: NewsItem[] = [
  {
    id: '1',
    headline: 'Apple Reports Record Q4 Revenue Driven by iPhone 15 Sales',
    summary: 'Apple Inc. exceeded analyst expectations with quarterly revenue of $89.5 billion, primarily driven by strong iPhone 15 sales and robust services growth.',
    timestamp: '2024-01-02T14:30:00Z',
    relatedSymbols: ['AAPL'],
    impact: 'positive',
    source: 'Financial Times',
    url: 'https://ft.com/apple-q4-earnings'
  },
  {
    id: '2',
    headline: 'Microsoft Azure Cloud Revenue Surges 30% Year-over-Year',
    summary: 'Microsoft Corporation reported strong cloud growth with Azure revenue increasing 30% YoY, solidifying its position as the second-largest cloud provider.',
    timestamp: '2024-01-02T13:15:00Z',
    relatedSymbols: ['MSFT'],
    impact: 'positive',
    source: 'Bloomberg',
    url: 'https://bloomberg.com/microsoft-azure-growth'
  },
  {
    id: '3',
    headline: 'Tesla Faces Production Challenges at Gigafactory Berlin',
    summary: 'Tesla Inc. reported temporary production delays at its Berlin facility due to supply chain disruptions, potentially affecting Q1 delivery targets.',
    timestamp: '2024-01-02T11:45:00Z',
    relatedSymbols: ['TSLA'],
    impact: 'negative',
    source: 'Reuters',
    url: 'https://reuters.com/tesla-berlin-production'
  },
  {
    id: '4',
    headline: 'Google Unveils Advanced AI Chip to Compete with NVIDIA',
    summary: 'Alphabet Inc. announced its new TPU v5 chip designed for AI workloads, marking a significant step in competing with NVIDIA in the AI hardware market.',
    timestamp: '2024-01-02T10:30:00Z',
    relatedSymbols: ['GOOGL', 'NVDA'],
    impact: 'positive',
    source: 'TechCrunch',
    url: 'https://techcrunch.com/google-tpu-v5'
  },
  {
    id: '5',
    headline: 'NVIDIA Stock Reaches New All-Time High on AI Demand',
    summary: 'NVIDIA Corporation shares hit a record high of $875 as enterprise AI adoption continues to accelerate, with data center revenue up 200% year-over-year.',
    timestamp: '2024-01-02T09:20:00Z',
    relatedSymbols: ['NVDA'],
    impact: 'positive',
    source: 'CNBC',
    url: 'https://cnbc.com/nvidia-record-high'
  },
  {
    id: '6',
    headline: 'Amazon Prime Day Generates Record $12.7 Billion in Sales',
    summary: 'Amazon.com Inc. reported its most successful Prime Day event ever, with global sales reaching $12.7 billion, a 15% increase from the previous year.',
    timestamp: '2024-01-02T08:00:00Z',
    relatedSymbols: ['AMZN'],
    impact: 'positive',
    source: 'Wall Street Journal',
    url: 'https://wsj.com/amazon-prime-day-record'
  },
  {
    id: '7',
    headline: 'Meta Announces $40 Billion Share Buyback Program',
    summary: 'Meta Platforms Inc. unveiled a massive $40 billion share repurchase program while maintaining strong user growth across its family of apps.',
    timestamp: '2024-01-02T07:15:00Z',
    relatedSymbols: ['META'],
    impact: 'positive',
    source: 'MarketWatch',
    url: 'https://marketwatch.com/meta-buyback'
  },
  {
    id: '8',
    headline: 'Netflix Loses 2.4 Million Subscribers in Mature Markets',
    summary: 'Netflix Inc. reported a decline of 2.4 million subscribers in North America and Europe, though gains in emerging markets partially offset losses.',
    timestamp: '2024-01-02T06:30:00Z',
    relatedSymbols: ['NFLX'],
    impact: 'negative',
    source: 'Variety',
    url: 'https://variety.com/netflix-subscriber-loss'
  },
  {
    id: '9',
    headline: 'Federal Reserve Signals Potential Rate Cuts in 2024',
    summary: 'The Federal Reserve indicated a dovish stance with potential interest rate cuts later in 2024, boosting tech stocks and growth companies.',
    timestamp: '2024-01-02T05:45:00Z',
    relatedSymbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN', 'META', 'NFLX'],
    impact: 'positive',
    source: 'Associated Press',
    url: 'https://ap.com/fed-rate-cuts-signal'
  },
  {
    id: '10',
    headline: 'Apple Faces Antitrust Investigation in EU Over App Store Policies',
    summary: 'The European Union launched a formal antitrust investigation into Apple Inc.\'s App Store practices, potentially leading to significant fines.',
    timestamp: '2024-01-01T20:30:00Z',
    relatedSymbols: ['AAPL'],
    impact: 'negative',
    source: 'European Commission',
    url: 'https://ec.europa.eu/apple-antitrust'
  },
  {
    id: '11',
    headline: 'Microsoft Teams Reaches 300 Million Monthly Active Users',
    summary: 'Microsoft\'s collaboration platform Teams hit a milestone of 300 million monthly active users, strengthening its position in the enterprise software market.',
    timestamp: '2024-01-01T19:15:00Z',
    relatedSymbols: ['MSFT'],
    impact: 'positive',
    source: 'The Verge',
    url: 'https://theverge.com/microsoft-teams-300m'
  },
  {
    id: '12',
    headline: 'Tesla Cybertruck Production Delayed Again Due to Manufacturing Issues',
    summary: 'Tesla Inc. pushed back Cybertruck deliveries to Q3 2024, citing complex manufacturing challenges and battery supply constraints.',
    timestamp: '2024-01-01T18:00:00Z',
    relatedSymbols: ['TSLA'],
    impact: 'negative',
    source: 'Electrek',
    url: 'https://electrek.co/tesla-cybertruck-delay'
  },
  {
    id: '13',
    headline: 'Google Search Market Share Drops Below 90% for First Time',
    summary: 'Alphabet Inc.\'s Google search engine market share fell to 89.1%, its lowest level in over a decade, as AI-powered alternatives gain traction.',
    timestamp: '2024-01-01T17:20:00Z',
    relatedSymbols: ['GOOGL'],
    impact: 'negative',
    source: 'StatCounter',
    url: 'https://statcounter.com/google-market-share'
  },
  {
    id: '14',
    headline: 'NVIDIA Partners with Toyota for Next-Gen Autonomous Vehicles',
    summary: 'NVIDIA Corporation announced a strategic partnership with Toyota to develop AI-powered autonomous driving systems for commercial deployment.',
    timestamp: '2024-01-01T16:45:00Z',
    relatedSymbols: ['NVDA'],
    impact: 'positive',
    source: 'Automotive News',
    url: 'https://autonews.com/nvidia-toyota-partnership'
  },
  {
    id: '15',
    headline: 'Amazon Web Services Launches New AI Infrastructure Service',
    summary: 'AWS introduced Bedrock Enterprise, a comprehensive AI infrastructure service targeting large enterprises looking to build custom AI applications.',
    timestamp: '2024-01-01T15:30:00Z',
    relatedSymbols: ['AMZN'],
    impact: 'positive',
    source: 'AWS Blog',
    url: 'https://aws.amazon.com/bedrock-enterprise'
  },
  {
    id: '16',
    headline: 'Meta\'s Reality Labs Division Reports $3.7 Billion Loss',
    summary: 'Meta Platforms Inc.\'s VR/AR division Reality Labs posted a quarterly loss of $3.7 billion, raising questions about metaverse investments.',
    timestamp: '2024-01-01T14:15:00Z',
    relatedSymbols: ['META'],
    impact: 'negative',
    source: 'The Information',
    url: 'https://theinformation.com/meta-reality-labs-loss'
  },
  {
    id: '17',
    headline: 'Netflix Expands Gaming Division with Major Studio Acquisition',
    summary: 'Netflix Inc. acquired indie game studio Night School Studio for $72 million, accelerating its push into mobile gaming content.',
    timestamp: '2024-01-01T13:00:00Z',
    relatedSymbols: ['NFLX'],
    impact: 'positive',
    source: 'GameSpot',
    url: 'https://gamespot.com/netflix-gaming-acquisition'
  },
  {
    id: '18',
    headline: 'Tech Stocks Rally on Strong Q4 GDP Growth Data',
    summary: 'Major technology stocks surged following better-than-expected GDP growth of 3.2%, indicating robust economic conditions for tech spending.',
    timestamp: '2024-01-01T12:30:00Z',
    relatedSymbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'AMZN', 'META', 'NFLX'],
    impact: 'positive',
    source: 'Yahoo Finance',
    url: 'https://finance.yahoo.com/tech-stocks-gdp-rally'
  },
  {
    id: '19',
    headline: 'Apple Vision Pro Pre-Orders Exceed 180,000 Units in First Weekend',
    summary: 'Apple Inc.\'s Vision Pro mixed reality headset saw strong initial demand with over 180,000 pre-orders in its first weekend of availability.',
    timestamp: '2024-01-01T11:45:00Z',
    relatedSymbols: ['AAPL'],
    impact: 'positive',
    source: 'MacRumors',
    url: 'https://macrumors.com/vision-pro-preorders'
  },
  {
    id: '20',
    headline: 'Microsoft Copilot AI Assistant Reaches 100 Million Users',
    summary: 'Microsoft Corporation\'s AI assistant Copilot achieved 100 million monthly active users across Office 365 and Windows platforms.',
    timestamp: '2024-01-01T10:20:00Z',
    relatedSymbols: ['MSFT'],
    impact: 'positive',
    source: 'ZDNet',
    url: 'https://zdnet.com/microsoft-copilot-100m-users'
  },
  {
    id: '21',
    headline: 'Tesla Supercharger Network Opens to All Electric Vehicles',
    summary: 'Tesla Inc. began opening its Supercharger network to non-Tesla EVs nationwide, creating a new revenue stream while supporting industry growth.',
    timestamp: '2024-01-01T09:15:00Z',
    relatedSymbols: ['TSLA'],
    impact: 'positive',
    source: 'InsideEVs',
    url: 'https://insideevs.com/tesla-supercharger-open'
  },
  {
    id: '22',
    headline: 'Google Cloud Revenue Grows 35% as Enterprise Adoption Accelerates',
    summary: 'Alphabet Inc.\'s Google Cloud Platform reported 35% revenue growth, gaining market share in the competitive cloud infrastructure space.',
    timestamp: '2024-01-01T08:30:00Z',
    relatedSymbols: ['GOOGL'],
    impact: 'positive',
    source: 'Cloud Wars',
    url: 'https://cloudwars.co/google-cloud-growth'
  },
  {
    id: '23',
    headline: 'Semiconductor Shortage Impacts Multiple Tech Companies',
    summary: 'Ongoing semiconductor shortages are affecting production schedules at major tech companies, potentially impacting Q1 2024 earnings.',
    timestamp: '2024-01-01T07:45:00Z',
    relatedSymbols: ['AAPL', 'TSLA', 'NVDA'],
    impact: 'negative',
    source: 'Semiconductor Industry Association',
    url: 'https://semiconductors.org/supply-chain-update'
  },
  {
    id: '24',
    headline: 'Amazon Pharmacy Expansion Threatens Traditional Retailers',
    summary: 'Amazon.com Inc. announced nationwide expansion of its pharmacy services, intensifying competition with CVS, Walgreens, and other traditional pharmacies.',
    timestamp: '2024-01-01T06:20:00Z',
    relatedSymbols: ['AMZN'],
    impact: 'positive',
    source: 'Modern Healthcare',
    url: 'https://modernhealthcare.com/amazon-pharmacy-expansion'
  },
  {
    id: '25',
    headline: 'Meta Faces New Privacy Lawsuit Over Data Collection Practices',
    summary: 'Meta Platforms Inc. is facing a class-action lawsuit alleging improper data collection from non-users, potentially resulting in billions in damages.',
    timestamp: '2024-01-01T05:30:00Z',
    relatedSymbols: ['META'],
    impact: 'negative',
    source: 'Privacy International',
    url: 'https://privacyinternational.org/meta-lawsuit'
  }
];