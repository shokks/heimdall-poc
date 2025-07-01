# Portfolio Intelligence - Internal Documentation

**Status**: POC Phase (85% Complete)  
**Project Type**: Closed-source  
**Purpose**: Personalized financial news feed filtered by user's stock portfolio

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm/yarn
- API Keys (see Environment Setup)

### Installation

```bash
# Clone the repository
git clone [repository-url]

# Install dependencies
npm install

# Set up environment variables (see below)
cp .env.example .env.local

# Run development server
npm run dev
```

## 🔑 Environment Setup

Create `.env.local` file with:

```bash
OPENAI_API_KEY=your_openai_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
# Or for testing without real API:
# ALPHA_VANTAGE_API_KEY=demo
```

**API Key Sources:**

- OpenAI: https://platform.openai.com/api-keys
- Alpha Vantage: https://www.alphavantage.co/support/#api-key

**Note**: Use `ALPHA_VANTAGE_API_KEY=demo` for testing with mock data if you don't have an API key.

## 📁 Project Structure

```
/
├── _IDEA/                      # Product documentation
│   ├── 00_OverView.md         # Product vision & roadmap
│   ├── 02_Phase1_ImplementationPlan.md  # POC implementation checklist
│   └── 06_DesignSystemCompliance.md     # Design system guidelines
│
├── app/                        # Next.js App Router
│   ├── api/                   # API routes
│   │   ├── parse-portfolio/   # OpenAI portfolio parsing
│   │   └── stock-prices/      # Alpha Vantage integration
│   ├── globals.css            # Theme system (CSS custom properties)
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Main application page
│
├── components/                 # React components
│   ├── PortfolioInput.tsx     # Natural language portfolio entry
│   ├── PortfolioDisplay.tsx   # Portfolio positions with real-time prices
│   ├── NewsDisplay.tsx        # Filtered news feed
│   ├── InsightsDisplay.tsx    # AI-generated insights
│   └── ui/                    # Reusable UI components
│       ├── financial.tsx      # Financial data components
│       └── loading.tsx        # Loading states
│
├── lib/                        # Utility functions
│   ├── storage.ts             # LocalStorage portfolio management
│   ├── api.ts                 # API utilities
│   ├── newsFilter.ts          # News filtering logic
│   └── insights.ts            # AI insights generation
│
├── data/                       # Mock data
│   └── mockNews.ts            # 25+ mock news articles
│
├── CLAUDE.md                  # AI coding assistant instructions
└── package.json               # Dependencies & scripts
```

## 🛠️ Development Commands

```bash
npm run dev          # Development server (http://localhost:3000)
npm run build        # Production build
npm run start        # Production server
npm run lint         # Run ESLint
```

## 🎨 Design System

The project uses a semantic color system with CSS custom properties defined in `app/globals.css`.

**Key Design Tokens:**

- `--color-primary`: Primary brand color
- `--color-accent`: Accent/highlight color
- `--color-destructive`: Error/negative states
- `--color-card`: Card backgrounds
- `--color-muted`: Secondary text

**Documentation**: See `_IDEA/06_DesignSystemCompliance.md` for complete guidelines.

## 🔌 API Integrations

### OpenAI API

- **Endpoint**: `/api/parse-portfolio`
- **Purpose**: Parse natural language portfolio descriptions
- **Model**: GPT-4o
- **Input**: Text description ("I have 100 Apple shares")
- **Output**: Structured portfolio data

### Alpha Vantage API

- **Endpoint**: `/api/stock-prices`
- **Purpose**: Fetch real-time stock prices
- **Function**: GLOBAL_QUOTE
- **Rate Limit**: 5 calls/minute (free tier)

## 📊 Data Flow

1. **Portfolio Entry**: User enters natural language description
2. **AI Parsing**: OpenAI extracts stock symbols and quantities
3. **Price Fetching**: Alpha Vantage provides real-time prices
4. **News Filtering**: System filters mock news by portfolio symbols
5. **Insights Generation**: AI analyzes portfolio performance
6. **Persistence**: LocalStorage saves portfolio data

## 🚦 Current Implementation Status

### ✅ Completed

- Environment setup and configuration
- Portfolio display with real-time prices
- Mock news system with filtering
- AI insights generation
- Design system compliance
- Main page integration

### 🔄 In Progress

- Portfolio input component (OpenAI integration)

### ⏳ Remaining

- Testing & deployment
- User feedback collection

## 🧪 Testing

### Local Testing

1. Enter various portfolio formats in the input
2. Verify price fetching for different symbols
3. Test news filtering with multiple portfolios
4. Check localStorage persistence
5. Test mobile responsiveness

### Test Data Examples

```
"I have 100 shares of Apple and 50 shares of Microsoft"
"My portfolio: 200 TSLA, 100 GOOGL, 50 AMZN"
"I own Tesla, Amazon, and Netflix stocks"
```

## 📝 Key Files Documentation

- **`CLAUDE.md`**: Instructions for AI coding assistants
- **`_IDEA/00_OverView.md`**: Product vision, phases, and roadmap
- **`_IDEA/02_Phase1_ImplementationPlan.md`**: Detailed POC tasks and progress
- **`components/README.md`**: Component library documentation

## 🔒 Security Notes

- API keys stored in `.env.local` (never commit)
- No user authentication in POC phase
- Portfolio data stored in browser localStorage
- No sensitive financial data transmitted

## 📞 Support & Resources

- **Project Lead**: [Contact info]
- **Technical Documentation**: `_IDEA/` directory
- **Component Examples**: `components/examples/DesignSystemShowcase.tsx`

## 🚀 Deployment

The application is configured for Vercel deployment:

1. Push to main branch
2. Set environment variables in Vercel dashboard
3. Deploy automatically

**Note**: Ensure API keys are added to Vercel environment variables before deployment.

---

_This is an internal document for the Portfolio Intelligence POC. For product documentation, see `_IDEA/00_OverView.md`._
