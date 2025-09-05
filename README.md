# Rating Calculator

A Next.js + TypeScript application for calculating how many reviews need to be removed to achieve a target business rating. Designed to be embedded as an iframe in Wix Nexus templates.

## Features

- **Business Search**: Search for businesses using DataForSEO API
- **Rating Analysis**: View current ratings and review breakdowns
- **Target Rating Calculator**: Calculate reviews to remove for desired rating
- **Responsive Design**: Works on desktop and mobile
- **Iframe Ready**: Embed page optimized for iframe integration

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your DataForSEO credentials:
   ```
   DATAFORSEO_LOGIN=your_login_here
   DATAFORSEO_PASSWORD=your_password_here
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Main page: http://localhost:3000
   - Embed page: http://localhost:3000/embed

## Project Structure

```
├── components/          # Reusable UI components
├── hooks/              # Custom React hooks
├── pages/              # Next.js pages and API routes
│   ├── api/           # DataForSEO proxy endpoints
│   ├── index.tsx      # Main application page
│   └── embed.tsx      # Iframe-optimized page
├── styles/            # CSS Modules
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

## Components

- **Button**: Reusable button with size variants
- **Input**: Text input with Enter key support
- **Typography**: Responsive text components (h1, h2, body)
- **Card**: Container for grouping content
- **Overlay**: Full-screen modal overlay
- **Dropdown**: Business search results dropdown

## API Endpoints

- `POST /api/search`: Search businesses by name
- `POST /api/rating`: Get rating data for a business

## Usage Flow

1. **Search**: Enter business name and search
2. **Select**: Choose business from dropdown results
3. **Analyze**: View current rating and review breakdown
4. **Calculate**: Select target rating and get removal recommendations

## Embedding

Use `/embed` page for iframe integration:

```html
<iframe src="http://localhost:3000/embed" width="100%" height="600px"></iframe>
```

## German UI Text

All visible text is in German as requested:
- "Unternehmensname eingeben..." (Enter business name...)
- "Aktuelles Rating" (Current rating)
- "Zielrating" (Target rating)
- "Bewertungen entfernen" (Remove reviews)

## Technologies

- Next.js 14 (Pages Router)
- TypeScript
- CSS Modules
- DataForSEO API integration
