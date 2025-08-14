# BigQuery Lineage Visualizer - Claude Context

## Project Overview
Interactive visualization tool for BigQuery table lineage and dependencies, built for Measurelab organization. Visualizes data flow from raw sources through intermediate transformations to final dashboards.

## Tech Stack
- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite (not Next.js - client-side only app)
- **Styling**: Tailwind CSS v3 + shadcn/ui with Measurelab theme
- **Visualization**: D3.js v7 force-directed graph
- **Icons**: Lucide React
- **Data Processing**: PapaParse for CSV parsing
- **Font**: Poppins (Google Fonts)

## Project Structure
```
linage_generator/
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── LineageGraph.tsx       # D3.js visualization
│   │   ├── TableDetails.tsx       # Side panel (Sheet)
│   │   ├── DashboardView.tsx      # Dashboard selection
│   │   ├── SearchFilter.tsx       # Search & filters
│   │   └── Legend.tsx             # Graph legend
│   ├── utils/
│   │   ├── dataParser.ts          # CSV parsing logic
│   │   └── graphBuilder.ts        # Graph data processing
│   ├── types/index.ts             # TypeScript interfaces
│   ├── lib/utils.ts               # Utility functions (cn)
│   └── App.tsx                    # Main application
├── public/datasets/               # CSV data files (gitignored)
└── components.json                # shadcn config
```

## Data Model
### CSV Files Expected (in public/datasets/):
- `Digital Science Mapping Tables.csv` - Table metadata
- `Digital Science Mapping Table Lineage.csv` - Relationships
- `Digital Science Mapping Dashboards.csv` - Dashboard info
- `Digital Science Mapping.csv` - Dashboard-table mappings

### Key Types:
- **Table**: ID, name, dataset, layer (Raw/Inter/Target), type, scheduled query flag
- **TableLineage**: source-target relationships
- **Dashboard**: dashboard metadata and linked tables

## Measurelab Theme
Uses official Measurelab design system:
- **Primary Color**: `oklch(0.7879 0.1991 139.5227)` (green)
- **Font**: Poppins (all weights)
- **Radius**: 0.625rem
- **Typography**: Semibold headlines (not bold)
- **Color Space**: OKLCH (not HSL)
- **Full theme**: Includes sidebar colors, chart colors, shadows

## Key Features
1. **Interactive D3 Graph**: Force-directed layout with 179+ tables
2. **Dashboard Integration**: Click dashboards to highlight dependent tables
3. **Advanced Filtering**: By dataset, layer, table type, scheduled queries
4. **Table Details**: Sheet panel showing upstream/downstream relationships
5. **Search**: Real-time table search by name/ID/dataset
6. **Responsive Design**: Sidebar (384px) + main content area

## Development Commands
- `npm run dev` - Start Vite dev server (port 3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Git Repository
- **Repo**: `https://github.com/Measurelab/ml-linage-visualiser`
- **Branch**: main
- **CSV files excluded** from repo for privacy

## Implementation Notes
- **D3 Integration**: Custom React wrapper around D3 force simulation
- **Color Coding**: Green (Raw) → Blue (Inter) → Orange/Amber (Target)
- **Scheduled Queries**: Indicated with dashed circles
- **Performance**: Handles 179 tables + 234+ relationships smoothly
- **Theme Integration**: Full shadcn/ui implementation with Measurelab branding

## UI/UX Design Guidelines
**ALWAYS follow these rules when working on this project:**

### Typography & Text
- **Always use sentence case, not title case** (e.g., "Table details" not "Table Details")
- **Always use Poppins font** (already configured as default sans-serif)
- **Always use semibold font weight rather than bold** (`font-semibold` not `font-bold`)
- **Never use tracking-tight or tracking-tighter** (avoid letter-spacing reduction)

### Component Standards
- **Always use shadcn/ui components** following best practices for UX design
- **Follow shadcn/ui v4 conventions** with data-slot attributes and modern styling
- **Maintain Measurelab theme consistency** with OKLCH colors and design system
- **Use semantic HTML** with proper accessibility attributes

### Measurelab Brand Standards
- **Primary green**: `oklch(0.7879 0.1991 139.5227)`
- **Radius**: 0.625rem for consistency
- **Color space**: OKLCH (never HSL)
- **Shadows**: Use shadow-xs and defined shadow utilities

## Future Considerations
- Could migrate to Next.js if server-side features needed
- CSV data could be replaced with BigQuery API integration
- Dark mode support already configured in theme
- Export functionality could be added for documentation