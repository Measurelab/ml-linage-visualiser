# BigQuery Lineage Visualizer

An interactive visualization tool for exploring BigQuery table lineage, dependencies, and dashboard relationships.

## Features

- **Interactive Network Graph**: Visualize table relationships with a force-directed graph
- **Layer-based Color Coding**: Tables are color-coded by layer (Raw, Inter, Target)
- **Dashboard Integration**: See which tables feed into each dashboard
- **Advanced Filtering**: Filter by dataset, layer, table type, and search by name
- **Table Details Panel**: Click any table to see upstream/downstream dependencies
- **Scheduled Query Indicators**: Easily identify scheduled queries with special visual markers

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd linage_generator
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Data Structure

The application expects CSV files in the `datasets` folder with the following structure:

- **Digital Science Mapping Tables.csv**: Contains table metadata (ID, name, dataset, layer, type, etc.)
- **Digital Science Mapping Table Lineage.csv**: Defines relationships between tables
- **Digital Science Mapping Dashboards.csv**: Dashboard information
- **Digital Science Mapping.csv**: Maps dashboards to their dependent tables

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

## Technologies Used

- React with TypeScript
- D3.js for graph visualization
- Tailwind CSS for styling
- Vite for build tooling
- PapaParse for CSV parsing

## Project Structure

```
linage_generator/
├── src/
│   ├── components/       # React components
│   ├── utils/            # Data parsing and graph utilities
│   ├── types/            # TypeScript type definitions
│   ├── App.tsx          # Main application component
│   └── main.tsx         # Application entry point
├── datasets/            # CSV data files
├── public/              # Static assets
└── package.json         # Project dependencies
```