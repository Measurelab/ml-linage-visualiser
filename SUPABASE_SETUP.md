# Supabase Setup for Column Management

## 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and anon key

## 2. Database Schema
Run this SQL in your Supabase SQL Editor:

```sql
-- Create table_columns table
CREATE TABLE table_columns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id TEXT NOT NULL,
  column_name TEXT NOT NULL,
  data_type TEXT NOT NULL CHECK (data_type IN ('STRING', 'INTEGER', 'FLOAT', 'BOOLEAN', 'TIMESTAMP', 'DATE', 'JSON', 'ARRAY')),
  is_nullable BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(table_id, column_name)
);

-- Create RLS policies (if using Row Level Security)
ALTER TABLE table_columns ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (customize as needed)
CREATE POLICY "Allow all operations on table_columns" ON table_columns
  FOR ALL USING (true);

-- Create indexes for performance
CREATE INDEX idx_table_columns_table_id ON table_columns(table_id);
CREATE INDEX idx_table_columns_name ON table_columns(column_name);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_table_columns_updated_at 
    BEFORE UPDATE ON table_columns 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 3. Environment Variables
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## 4. Testing
- The application will gracefully handle missing Supabase configuration
- Column features will be disabled if Supabase is not configured
- Check browser console for connection status

## 5. Data Migration (Optional)

### JSON Schema Upload
The easiest way to populate columns is using the "Upload Schema" button in the table details panel. Supported formats:

**BigQuery Schema Format:**
```json
[
  {
    "name": "id",
    "type": "INTEGER",
    "mode": "REQUIRED",
    "description": "Primary key"
  },
  {
    "name": "email",
    "type": "STRING",
    "mode": "NULLABLE",
    "description": "User email address"
  }
]
```

**Simple Format:**
```json
{
  "id": "INTEGER",
  "email": "STRING",
  "created_at": "TIMESTAMP",
  "active": "BOOLEAN"
}
```

**Custom Format:**
```json
{
  "id": {
    "type": "INTEGER",
    "nullable": false,
    "description": "Primary key"
  },
  "email": {
    "type": "STRING",
    "nullable": true,
    "description": "User email"
  }
}
```

### Programmatic Bulk Insert
You can also use the bulk insert functionality programmatically:

```javascript
import { createBulkColumns } from './src/services/columns';

const columns = [
  {
    table_id: 'your_table_id',
    column_name: 'id',
    data_type: 'INTEGER',
    is_nullable: false,
    description: 'Primary key'
  },
  // ... more columns
];

await createBulkColumns(columns);
```

### Supported Data Types
- `STRING` - Text data
- `INTEGER` - Whole numbers
- `FLOAT` - Decimal numbers
- `BOOLEAN` - True/false values
- `TIMESTAMP` - Date and time
- `DATE` - Date only
- `JSON` - JSON objects/structures
- `ARRAY` - Array/repeated values