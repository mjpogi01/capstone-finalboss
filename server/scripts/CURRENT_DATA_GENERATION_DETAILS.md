# Current Data Generation Details

## Overview
The script generates historical order data from **January 1, 2022** to **October 31, 2025** (approximately 3 years and 10 months).

## Customer Generation
- **Target**: **Exactly 923 customers**, all with at least one order
- **Method**: Customers are created on-demand when orders are placed
- **Dynamic Reuse Rate**: 
  - While below 923 customers: Adjusts dynamically to ensure we reach exactly 923
  - Once 923 customers reached: 100% reuse rate (all future orders use existing customers)
- **Guarantee**: Every customer account created will have at least one order

## Order Generation

### Date Range
- **Start Date**: January 1, 2022
- **End Date**: October 31, 2025
- **Total Days**: ~1,369 days

### Daily Order Generation
- **Base Production**: 
  - Normal season: ~36 jerseys/day
  - Peak season: ~66 jerseys/day
- **Growth Multiplier**: Starts at 0.6x (2022), grows to 1.2x (2025)
- **Peak Seasons**: 
  - Summer (March-May)
  - Intramurals (varies)
  - Youth Week (August)
- **Weekend Reduction**: 60% of weekday production
- **COVID Recovery**: Gradual recovery from 0.45x to 1.0x over first 6 months

### Order Characteristics
- **Average Jerseys per Order**: ~11.5 jerseys
- **Order Types**:
  - Team orders: 85% (8-15 jerseys)
  - Individual orders: 15% (1-3 jerseys)
- **Cancellation Rate**: 3% of orders

### Product Distribution
- **32%** Basketball jerseys
- **22%** Volleyball jerseys
- **13%** T-shirts
- **13%** Hoodies
- **10%** Long Sleeves
- **11%** Uniforms
- **3%** Trophies
- **6%** Medals
- **3%** Balls

### Shipping Methods
- Delivery
- Pickup
- Mixed (varies by order type)

### Order Status Distribution
- **97%** Completed/Delivered
- **3%** Cancelled

## Geographic Distribution
- **Primary Provinces**: Batangas, Oriental Mindoro
- **Cities**: Distributed across service area using shapefile data
- **Barangays**: Uses actual barangay centroids for accurate location data

## Branch Distribution
- **Branches**: Loaded from database (or defaults)
- **Weighted Distribution**: Different branches have different priority weights
- **Branch Order Counts**: Tracked per branch

## Customer Segments
- **Loyal Customers**: 12% (frequent repeat customers)
- **Engaged Customers**: 38% (moderate repeat customers)
- **Casual Customers**: 50% (occasional customers)

## Estimated Output (Current Configuration)
Based on the current settings, the script will generate:
- **Total Customers**: **Exactly 923** (guaranteed)
- **Total Orders**: ~4,000 - 6,000 orders (varies by growth and seasonality)
- **Total Jerseys**: ~50,000 - 80,000 jerseys
- **Total Revenue**: Varies based on product mix and pricing
- **Average Orders per Customer**: ~4-7 orders (varies based on total orders generated)
- **Customer Distribution**: 
  - All 923 customers will have at least 1 order
  - Some customers will have multiple orders (repeat customers)
  - Distribution follows realistic patterns (some loyal, some casual)

## Data Quality Features
- ✅ All customers have at least one order (on-demand creation)
- ✅ Realistic growth curve over time
- ✅ Seasonal variations
- ✅ Geographic distribution based on actual locations
- ✅ Product catalog integration
- ✅ Branch distribution tracking
- ✅ Cleanup of customers without orders

