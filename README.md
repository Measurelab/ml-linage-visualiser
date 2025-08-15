# BigQuery Lineage Visualizer

An interactive visualization tool for exploring BigQuery table lineage, dependencies, and dashboard relationships. Built for Measurelab organization with multi-tenant portal support.

## Features

### Core Visualization
- **Interactive Network Graph**: Visualize table relationships with a force-directed graph
- **Layer-based Color Coding**: Tables are color-coded by layer (Raw, Inter, Target)
- **Dashboard Integration**: See which tables feed into each dashboard
- **Advanced Filtering**: Filter by dataset, layer, table type, and search by name
- **Table Details Panel**: Click any table to see upstream/downstream dependencies
- **Scheduled Query Indicators**: Easily identify scheduled queries with special visual markers

### Multi-Tenant Portal System
- **Portal-Based Filtering**: Each client portal sees only their own projects and data
- **Secure Data Isolation**: Complete separation between different client portals
- **Measurelab Admin Mode**: Special admin portal showing all projects across all portals
- **Authenticated Access**: HMAC-SHA256 authentication for iframe embedding
- **Project Management**: Create, edit, and manage projects within portal boundaries

### Data Management
- **Supabase Integration**: Cloud database for project and lineage data storage
- **Excel/CSV Upload**: Support for both Excel and CSV data import formats
- **Project Switching**: Multiple project support with easy switching between datasets
- **Real-time Updates**: Dynamic data loading and project synchronization

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account and project (for database)

### Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/Measurelab/ml-linage-visualiser
cd linage_generator
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with:
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Authentication (for production)
VITE_REQUIRE_AUTH=true
VITE_TOOL_SECRET=your_secure_shared_secret
VITE_ALLOWED_ORIGIN=https://your-main-site.vercel.app
VITE_DEV_PASSWORD=your_dev_password
```

4. Set up database:
```bash
# Ensure your Supabase database has the required schema
# The database should have tables: projects, tables, lineages, dashboards, dashboard_tables
# The projects table should include a portal_name column for multi-tenancy
```

5. Start the development server:
```bash
npm run dev
```

6. Open your browser and navigate to `http://localhost:3000`

## Portal System

### Access Modes

**Client Portal Access:**
```
https://your-app.vercel.app?portal=EDF%20Energy
https://your-app.vercel.app?portal=Digital%20Science
```

**Measurelab Admin Access:**
```
https://your-app.vercel.app?portal=measurelab
```

### Portal Features
- Each portal sees only their own projects and data
- Complete data isolation between portals
- Projects created in a portal are automatically tagged with that portal
- Measurelab admin portal shows all projects across all portals
- Admin mode displays "MEASURELAB ADMIN" badge in header

## Data Structure

The application supports both CSV upload and direct database management through Supabase:

### Database Schema
The Supabase database requires the following tables:

- **projects**: Stores project metadata with portal_name for multi-tenancy
  - Must include `portal_name TEXT` column
  - Should have unique constraint on `(portal_name, name)`
- **tables**: Table metadata with project relationships
- **lineages**: Table-to-table relationships and dependencies  
- **dashboards**: Dashboard information and metadata
- **dashboard_tables**: Dashboard-to-table mappings

**Note**: The database schema should already be configured if this is an existing deployment.

### CSV Upload Format
For legacy CSV upload, the application expects files with the following structure:

- **Tables CSV**: Contains table metadata (ID, name, dataset, layer, type, etc.)
- **Lineage CSV**: Defines relationships between tables
- **Dashboards CSV**: Dashboard information
- **Dashboard Tables CSV**: Maps dashboards to their dependent tables

### Excel Upload
Supports Excel files with multiple sheets containing the structured data above.

## Usage

### Viewing the Graph

- **Pan**: Click and drag on the background
- **Zoom**: Use mouse scroll wheel
- **Select Node**: Click on a node to view table details
- **Drag Nodes**: Click and drag nodes to reposition them

### Filtering

1. Use the search bar to find tables by name, ID, or dataset
2. Click the "Filters" button to access advanced filtering options:
   - Filter by layer (Raw, Inter, Target)
   - Filter by table type (Table, View, Query, Sheet)
   - Show only scheduled queries
   - Filter by specific datasets

### Dashboard View

1. Click on a dashboard in the left sidebar to highlight all its dependent tables
2. Dashboard tables will be highlighted in red on the graph
3. Click "Clear Selection" to remove highlighting

### Table Details

Click on any table node to open the details panel, which shows:
- Table metadata (dataset, layer, type)
- Links to BigQuery console (if available)
- List of upstream tables (data sources)
- List of downstream tables (data consumers)
- Click on related tables to navigate through the lineage

## Color Legend

- **Green nodes**: Raw layer tables
- **Blue nodes**: Intermediate layer tables
- **Orange nodes**: Target layer tables
- **Dashed circle**: Scheduled queries
- **Red border**: Dashboard-highlighted tables
- **Black border**: Currently selected table

## Building for Production

```bash
npm run build
```

The built application will be in the `dist` folder.

## Integration with Main Site

For iframe embedding in your main site, see the detailed guide in `MAIN_SITE_INTEGRATION.md`.

Key integration features:
- **HMAC Authentication**: Secure iframe embedding with authentication headers
- **Portal Parameter**: Automatic portal detection from URL parameters
- **Proxy Setup**: Main site acts as authenticated proxy for security
- **CORS Configuration**: Proper cross-origin resource sharing setup

## Deployment

### Environment Variables (Production)
```env
# Required for production
VITE_REQUIRE_AUTH=true
VITE_TOOL_SECRET=your_production_secret
VITE_ALLOWED_ORIGIN=https://your-main-site.vercel.app
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Build and Deploy
```bash
npm run build
```

The built application can be deployed to Vercel, Netlify, or any static hosting service.

## Technologies Used

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite (client-side only app)
- **Styling**: Tailwind CSS v3 + shadcn/ui with Measurelab theme
- **Visualization**: D3.js v7 force-directed graph
- **Database**: Supabase (PostgreSQL)
- **Authentication**: HMAC-SHA256 with timestamp validation
- **Data Processing**: PapaParse for CSV parsing + Excel file support
- **Icons**: Lucide React
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
│   │   ├── ProjectTabs.tsx        # Project management
│   │   ├── ExcelUpload.tsx        # Excel file upload
│   │   ├── DataUpload.tsx         # CSV file upload
│   │   └── DevLogin.tsx           # Development login
│   ├── contexts/
│   │   └── PortalContext.tsx      # Portal state management
│   ├── services/
│   │   ├── supabase.ts           # Database client
│   │   ├── projects.ts           # Project management
│   │   └── lineageData.ts        # Data import/export
│   ├── utils/
│   │   ├── dataParser.ts         # CSV parsing logic
│   │   ├── graphBuilder.ts       # Graph data processing
│   │   └── excelParser.ts        # Excel file handling
│   ├── types/index.ts            # TypeScript interfaces
│   ├── lib/utils.ts              # Utility functions
│   └── App.tsx                   # Main application
├── api/
│   └── auth-check.js             # Authentication endpoint
├── public/                       # Static assets
├── MAIN_SITE_INTEGRATION.md      # Integration guide
├── CLAUDE.md                     # Development notes
└── components.json               # shadcn config
```

## Support

- GitHub Repository: https://github.com/Measurelab/ml-linage-visualiser
- Issues: Report bugs and feature requests via GitHub Issues
- Documentation: See `MAIN_SITE_INTEGRATION.md` for detailed setup instructions