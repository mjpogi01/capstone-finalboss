# Stock, Size, and Branch Storage Structure

## Overview
This document explains how stocks, sizes, and branches are stored in the database for products, particularly for trophies with multiple sizes.

## Database Schema

### Products Table Structure

```sql
products {
  id: UUID (Primary Key)
  name: TEXT
  category: TEXT
  size: TEXT (JSON string of available sizes for trophies)
  price: DECIMAL(10,2)
  stock_quantity: INTEGER (Single stock quantity - used for simple products)
  size_stocks: JSONB (Per-size stock quantities - used for trophies with sizes)
  branch_id: INTEGER (Foreign key to branches table)
  trophy_prices: JSONB (Per-size prices for trophies)
  ...
}
```

## Storage Patterns

### 1. **Simple Products (Balls, Medals, etc.)**
- **stock_quantity**: Single integer value
- **branch_id**: One product per branch
- **Example**: 
  - Product A in Branch 1: `stock_quantity = 50`
  - Product A in Branch 2: `stock_quantity = 30`
  - (Separate product records for each branch)

### 2. **Trophies with Sizes**
- **size**: JSON array of sizes, e.g., `["13\"", "16\"", "19\"]`
- **trophy_prices**: JSONB object mapping size to price (same for all branches)
  ```json
  {
    "13\"": 500,
    "16\"": 750,
    "19\"": 1000
  }
  ```
- **size_stocks**: JSONB object mapping size to stock quantity (branch-specific)
  ```json
  {
    "13\"": 10,
    "16\"": 5,
    "19\"": 8
  }
  ```
  **Note**: Each branch product has its own `size_stocks` object with branch-specific quantities
- **branch_id**: One product record per branch
- **stock_quantity**: Set to `null` (not used when sizes exist)

### 3. **Branch Storage for Trophies**
- Each selected branch gets its own product record
- All records share the same:
  - `name`
  - `category`
  - `size` (array of sizes)
  - `trophy_prices` (same prices for all branches)
  - `size_stocks` (same stock quantities for all branches)
- Each record has a different:
  - `branch_id` (unique per branch)
  - `id` (unique product ID)

## Example Data Structure

### Trophy Product: "Championship Trophy"

**Branch 1 Product:**
```json
{
  "id": "uuid-1",
  "name": "Championship Trophy",
  "category": "trophies",
  "size": "[\"13\\\"\", \"16\\\"\", \"19\\\"\"]",
  "trophy_prices": {
    "13\"": 500,
    "16\"": 750,
    "19\"": 1000
  },
  "size_stocks": {
    "13\"": 10,
    "16\"": 5,
    "19\"": 8
  },
  "branch_id": 1,
  "stock_quantity": null
}
```

**Branch 2 Product:**
```json
{
  "id": "uuid-2",
  "name": "Championship Trophy",
  "category": "trophies",
  "size": "[\"13\\\"\", \"16\\\"\", \"19\\\"\"]",
  "trophy_prices": {
    "13\"": 500,
    "16\"": 750,
    "19\"": 1000
  },
  "size_stocks": {
    "13\"": 8,
    "16\"": 3,
    "19\"": 5
  },
  "branch_id": 2,
  "stock_quantity": null
}
```

**Note**: Each branch can have different stock quantities per size!

## Data Flow

### Frontend → Backend
1. User adds sizes: `["13\"", "16\"", "19\"]`
2. User sets prices: `{ "13\"": 500, "16\"": 750, "19\"": 1000 }`
3. User sets stocks: `{ "13\"": 10, "16\"": 5, "19\"": 8 }`
4. User selects branches: `[1, 2, 3]`
5. Frontend sends:
   ```json
   {
     "name": "Championship Trophy",
     "category": "trophies",
     "size": "[\"13\\\"\", \"16\\\"\", \"19\\\"\"]",
     "trophy_prices": { "13\"": 500, "16\"": 750, "19\"": 1000 },
     "size_stocks": "{\"13\\\"\": 10, \"16\\\"\": 5, \"19\\\"\": 8}",
     "branch_id": 1,
     "stock_quantity": null
   }
   ```
6. Backend creates one product record per selected branch

### Backend → Frontend
1. Backend returns product with:
   - `size_stocks` as JSONB object (automatically parsed by Supabase)
   - `trophy_prices` as JSONB object
   - `size` as JSON string
2. Frontend parses and displays:
   - Sizes from `size` field
   - Prices from `trophy_prices`
   - Stocks from `size_stocks`

## Key Points

1. **Per-Size Stocks**: Stored in `size_stocks` JSONB column as `{ "size": quantity }`
2. **Per-Size Prices**: Stored in `trophy_prices` JSONB column as `{ "size": price }`
3. **Branches**: Each branch gets a separate product record with the same size/prices/stocks
4. **No Branch-Specific Stocks**: Currently, all branches share the same stock quantities per size
   - If you need branch-specific stocks per size, you'd need a different structure (e.g., `{ "branch_id": { "size": quantity } }`)

## Current Implementation

**Each branch has its own stock quantities per size.** Each product record stores only the stocks for that specific branch:
- Branch 1 product: `size_stocks = { "13\"": 10, "16\"": 5 }`
- Branch 2 product: `size_stocks = { "13\"": 8, "16\"": 3 }`

This allows complete flexibility - each branch can have completely different stock levels for each size.

