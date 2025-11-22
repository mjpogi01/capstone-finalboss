# Analytics Page User Manual

## Table of Contents
1. [Overview](#overview)
2. [Access and Permissions](#access-and-permissions)
3. [Page Layout](#page-layout)
4. [Key Features](#key-features)
5. [Charts and Visualizations](#charts-and-visualizations)
6. [Filters and Search](#filters-and-search)
7. [AI Analysis (Nexus)](#ai-analysis-nexus)
8. [Sales Forecast](#sales-forecast)
9. [Customer Analytics](#customer-analytics)
10. [Geographic Distribution](#geographic-distribution)
11. [Tips and Best Practices](#tips-and-best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The Analytics page provides comprehensive insights into your business performance through interactive charts, data visualizations, and AI-powered analysis. It helps you understand sales trends, customer behavior, product performance, and geographic distribution of your orders.

### Key Capabilities
- **Real-time Data**: View up-to-date analytics from your order database
- **Multiple Visualizations**: Line charts, bar charts, pie charts, and heatmaps
- **AI-Powered Insights**: Get intelligent analysis and recommendations through Nexus AI
- **Sales Forecasting**: Predict future sales using advanced algorithms
- **Customizable Filters**: Filter data by time range, branch, order status, and year
- **Geographic Analysis**: Visualize customer locations on an interactive map

---

## Access and Permissions

### Who Can Access
- **Owners**: Full access to all analytics across all branches
- **Admins**: Access limited to their assigned branch data

### How to Access
1. Log in to your account
2. Navigate to the Admin/Owner dashboard
3. Click on **"Analytics"** in the sidebar menu
4. The analytics page will load with your data

### Permission Levels
- **Owners** see aggregated data from all branches
- **Admins** see data filtered to their assigned branch only
- Both roles can use all features, but data scope differs

---

## Page Layout

The Analytics page is organized into several main sections:

### Header Section
- **Page Title**: "Analytics"
- **Active Filters Indicator**: Shows count of active filters
- **Analyze Button**: Opens AI analysis for quick insights
- **Search Bar**: Search through analytics data
- **Filter Button**: Access advanced filtering options

### Main Content Area
The content is organized into tabs:
1. **Sales Tab**: Sales-related charts and metrics
2. **Customers Tab**: Customer analytics and insights
3. **Geographic Tab**: Customer location heatmap

### Sidebar
- Navigation menu for other admin/owner pages
- Quick access to other dashboard sections

---

## Key Features

### 1. Summary Cards
At the top of the page, you'll see key metrics:
- **Total Revenue**: Sum of all completed orders
- **Total Orders**: Count of all orders (excluding cancelled)
- **Total Customers**: Unique customer count
- **Average Order Value**: Total revenue divided by total orders

### 2. Interactive Charts
All charts are interactive:
- **Hover**: See detailed values for any data point
- **Zoom**: Click and drag to zoom into specific time periods
- **Tooltips**: Detailed information appears on hover

### 3. Real-time Updates
- Data refreshes automatically when you apply filters
- Charts update dynamically based on your selections
- Loading indicators show when data is being fetched

---

## Charts and Visualizations

### Sales Tab

#### 1. Total Sales Over Time
**Purpose**: Track revenue trends over time

**Features**:
- Toggle between Monthly and Yearly views
- Smooth line chart with area fill
- Shows sales progression over selected time period
- Automatically adjusts to show last 12 months if monthly data exceeds 12 entries

**How to Use**:
- Click the granularity toggle to switch between monthly/yearly views
- Hover over data points to see exact values
- Use filters to focus on specific time periods

#### 2. Daily Sales & Orders
**Purpose**: Monitor daily performance with dual metrics

**Features**:
- Dual-axis chart showing both Sales (₱) and Order Count
- Sales displayed as solid line with area fill
- Orders displayed as dashed line
- Default shows last 30 days

**How to Use**:
- Hover to see both sales and order count for any day
- Legend shows which line represents which metric
- Use time range filters to adjust the period

#### 3. Sales by Branch
**Purpose**: Compare performance across different branches

**Features**:
- Horizontal bar chart
- Color-coded bars for each branch
- Shows total sales per branch
- Sorted by sales amount (highest first)

**How to Use**:
- Hover over bars to see exact sales amounts
- Use branch filter to focus on specific branches
- Compare branch performance at a glance

#### 4. Order Pipeline Health
**Purpose**: Monitor order status distribution

**Features**:
- Donut/pie chart showing order status breakdown
- Four status categories:
  - **Completed**: Finished orders
  - **Processing**: Orders in production
  - **Pending**: Awaiting processing
  - **Cancelled**: Cancelled orders
- Shows both count and percentage

**How to Use**:
- Click legend items to highlight specific statuses
- Hover over segments to see detailed counts
- Use order status filter to focus on specific statuses

#### 5. Top Product Groups
**Purpose**: Identify best-selling product categories

**Features**:
- Horizontal bar chart
- Shows quantity sold, revenue, and order count
- Displays percentage share of total sales
- Top 7 product groups shown

**Product Groups Include**:
- Basketball Jerseys
- Volleyball Jerseys
- Hoodies
- T-shirts
- Long Sleeves
- Uniforms
- Sports Balls
- Trophies
- Medals
- Other Products

**How to Use**:
- Hover to see quantity, orders, revenue, and market share
- Identify which products drive most sales
- Use insights for inventory planning

#### 6. Sales Forecast
**Purpose**: Predict future sales performance

**Features**:
- Combined historical and forecast data
- Confidence levels for forecast points
- Multiple forecast ranges:
  - Next Month
  - Rest of Year
  - Next 12 Months
- Uses weighted Fourier regression algorithm

**How to Use**:
- Select forecast range from dropdown
- View historical trend (solid line) and forecast (dashed line)
- Check confidence percentages in tooltips
- Use summary metrics to understand projected growth

**Forecast Summary Shows**:
- Projected Revenue: Total forecasted revenue
- Projected Orders: Expected order count
- Average Monthly Revenue: Baseline comparison
- Expected Growth Rate: Percentage change vs baseline
- Average Confidence: Overall forecast reliability

### Customers Tab

#### 1. Customer Insights Summary
**Purpose**: Overview of customer metrics

**Metrics Displayed**:
- **Total Customers**: Unique customer count
- **New Customers**: Customers who ordered in last 30 days
- **Average Orders per Customer**: Customer loyalty metric
- **Average Spent per Customer**: Customer value metric

#### 2. Top Customers
**Purpose**: Identify highest-value customers

**Features**:
- Horizontal bar chart
- Shows top 8 customers by total spending
- Displays total spent and order count
- Helps identify VIP customers

**How to Use**:
- Hover to see customer name, total spent, and order count
- Use for customer retention strategies
- Identify customers for special promotions

### Geographic Tab

#### Customer Locations Heatmap
**Purpose**: Visualize customer distribution geographically

**Features**:
- Interactive map with heatmap overlay
- Shows customer concentration by location
- City-level statistics
- Covers service area (Batangas and Oriental Mindoro)

**How to Use**:
- View heatmap to see customer density
- Check city statistics list for detailed counts
- Identify expansion opportunities
- Understand delivery coverage

**Map Features**:
- Zoom in/out to explore areas
- Hover over heat points for details
- City statistics show customer count per city
- Sorted by customer count (highest first)

---

## Filters and Search

### Available Filters

#### 1. Time Range Filter
Options:
- **All**: Show all available data
- **Today**: Current day only
- **Week**: Last 7 days
- **Month**: Last 12 months
- **Quarter**: Current quarter
- **Year**: Yearly aggregation

#### 2. Branch Filter
- **All Branches**: Show data from all branches (owners only)
- **Specific Branch**: Filter to one branch
- Admins automatically see only their branch

#### 3. Order Status Filter
- **All Statuses**: Include all order statuses
- **Completed**: Only completed orders
- **Processing**: Only orders in production
- **Pending**: Only pending orders
- **Cancelled**: Only cancelled orders

#### 4. Year Range Filter
- **Start Year**: Beginning year for date range
- **End Year**: Ending year for date range
- Leave empty to include all years

### Using Filters

1. **Open Filter Panel**:
   - Click the filter icon (funnel) in the header
   - Filter panel appears as dropdown

2. **Apply Filters**:
   - Select desired options from each filter dropdown
   - Enter year ranges if needed
   - Filters apply automatically

3. **Clear Filters**:
   - Click "Clear All" button in filter panel
   - Or manually reset each filter to "All"

4. **Active Filter Indicator**:
   - Header shows count of active filters
   - Helps you remember what filters are applied

### Search Functionality

- **Search Bar**: Located in header
- **Purpose**: Search through analytics data
- **Usage**: Type keywords to find specific information
- Currently supports basic text search

---

## AI Analysis (Nexus)

Nexus is an AI-powered assistant that provides intelligent analysis of your analytics data.

### Accessing Nexus

**Method 1: Analyze Button**
1. Click the "Analyze" button in the header
2. Nexus opens with a quick overview of overall sales

**Method 2: Chart-Specific Analysis**
1. Each chart has an "Analyze" button
2. Click to get AI insights for that specific chart
3. Nexus opens with context about that visualization

**Method 3: Floating Chat**
1. Open Nexus chat modal
2. Ask general questions about your analytics
3. Nexus can analyze any chart or provide general insights

### Using Nexus

1. **Ask Questions**:
   - Type natural language questions
   - Examples:
     - "What are the sales trends this month?"
     - "Which branch is performing best?"
     - "Explain the forecast for next quarter"
     - "What products are selling most?"

2. **Chart-Specific Analysis**:
   - When analyzing a specific chart, Nexus has context
   - Ask questions about that chart's data
   - Get detailed insights and recommendations

3. **Conversation History**:
   - Nexus maintains conversation context
   - Follow-up questions are understood
   - Previous answers inform new responses

4. **SQL Queries**:
   - Nexus can show SQL queries it uses (if available)
   - Helps understand data sources
   - Useful for technical users

### Nexus Features

- **Intelligent Insights**: Identifies trends and patterns
- **Recommendations**: Suggests actions based on data
- **Natural Language**: Understands conversational queries
- **Context Awareness**: Remembers chart context and filters
- **Error Handling**: Provides helpful error messages if analysis fails

---

## Sales Forecast

The Sales Forecast feature uses advanced algorithms to predict future sales.

### Forecast Ranges

1. **Next Month**: Forecast for the upcoming month
2. **Rest of Year**: Forecast for remaining months of current year
3. **Next 12 Months**: Forecast for the next full year

### Understanding the Forecast

**Historical Data (Blue Line)**:
- Solid line showing actual past sales
- Used as baseline for predictions
- Minimum 18 months of data recommended for accuracy

**Forecast Data (Green Dashed Line)**:
- Predicted future sales
- Based on historical patterns and seasonality
- Confidence levels shown in tooltips

**Confidence Levels**:
- **High (80-95%)**: Very reliable forecast
- **Medium (60-79%)**: Reasonable confidence
- **Low (45-59%)**: Less reliable, use with caution

### Forecast Algorithm

The system uses:
- **Weighted Fourier Regression**: Primary method
  - Accounts for seasonal patterns
  - Weights recent data more heavily
  - Uses 6 harmonics for seasonality
- **Seasonal Naive**: Fallback method
  - Used when regression unavailable
  - Mirrors last year's patterns

### Forecast Summary Metrics

- **Projected Revenue**: Total forecasted revenue
- **Projected Orders**: Expected number of orders
- **Average Monthly Revenue**: Baseline for comparison
- **Baseline Revenue**: Expected revenue without growth
- **Expected Growth Rate**: Percentage change vs baseline
- **Average Confidence**: Overall forecast reliability

### Best Practices

1. **Data Requirements**: More historical data = better forecasts
2. **Seasonality**: System accounts for seasonal patterns
3. **Confidence Levels**: Consider confidence when making decisions
4. **Regular Updates**: Forecasts update as new data arrives
5. **Comparison**: Compare forecast to baseline to understand growth

---

## Customer Analytics

The Customer Analytics section provides insights into your customer base.

### Customer Summary

**Total Customers**:
- Count of unique customers who have placed orders
- Excludes cancelled orders
- Based on user_id from orders

**New Customers**:
- Customers who placed first order in last 30 days
- Helps track customer acquisition
- Useful for marketing campaigns

**Average Orders per Customer**:
- Total orders divided by unique customers
- Indicates customer loyalty
- Higher = more repeat customers

**Average Spent per Customer**:
- Total revenue divided by unique customers
- Shows customer lifetime value
- Useful for pricing strategies

### Top Customers

**Display**:
- Top 8 customers by total spending
- Shows customer name (or anonymized ID)
- Displays total spent and order count

**Use Cases**:
- Identify VIP customers
- Plan loyalty programs
- Personalize marketing
- Understand customer segments

**Privacy**:
- Customer names shown if available
- Email addresses may be displayed
- IDs used if name unavailable

---

## Geographic Distribution

The Geographic Distribution feature shows where your customers are located.

### Customer Locations Heatmap

**Coverage Area**:
- Primary: Batangas Province
- Secondary: Oriental Mindoro Province
- Service area boundaries enforced

**Map Features**:
- **Heatmap Overlay**: Shows customer density
- **City Statistics**: List of cities with customer counts
- **Interactive**: Zoom and pan to explore
- **Precise Coordinates**: Uses barangay-level data when available

**Data Sources**:
1. **User Addresses**: From user_addresses table
2. **Order Delivery Addresses**: From order delivery_address data
3. **Barangay Centroids**: Precise location data when available
4. **City Coordinates**: Fallback to city-level coordinates

### Understanding the Heatmap

**Color Intensity**:
- Darker colors = more customers
- Lighter colors = fewer customers
- Helps identify high-density areas

**City Statistics**:
- Shows customer count per city
- Sorted by count (highest first)
- Includes province information

**Use Cases**:
- **Expansion Planning**: Identify underserved areas
- **Delivery Optimization**: Plan delivery routes
- **Marketing**: Target specific geographic areas
- **Coverage Analysis**: Understand service area coverage

### Geographic Data Quality

**Precise Data**:
- Uses exact coordinates when available
- Barangay-level precision
- More accurate heatmap

**Fallback Data**:
- City-level coordinates if precise data unavailable
- Still provides useful insights
- System indicates data quality

---

## Tips and Best Practices

### Getting Started

1. **Start Broad**: Begin with "All" filters to see overall picture
2. **Explore Charts**: Click through different tabs to understand data
3. **Use AI**: Try Nexus for quick insights
4. **Check Forecast**: Review sales forecast for planning

### Data Analysis

1. **Compare Periods**: Use year filters to compare year-over-year
2. **Branch Comparison**: Compare branch performance (owners)
3. **Product Analysis**: Identify top products for inventory planning
4. **Customer Segments**: Use customer analytics for marketing

### Making Decisions

1. **Use Multiple Metrics**: Don't rely on single chart
2. **Consider Context**: Understand business context for data
3. **Check Confidence**: For forecasts, consider confidence levels
4. **Regular Monitoring**: Check analytics regularly for trends

### Performance Optimization

1. **Filter Early**: Apply filters before analyzing to reduce load
2. **Use Appropriate Ranges**: Don't request unnecessarily long periods
3. **Cache Data**: System caches data for faster loading
4. **Batch Queries**: Multiple charts load in parallel

### Best Practices for Forecasts

1. **More Data = Better**: Ensure sufficient historical data
2. **Seasonal Awareness**: Understand seasonal patterns
3. **Confidence Matters**: Use confidence levels in planning
4. **Regular Updates**: Check forecasts regularly as new data arrives
5. **Compare to Actual**: Track forecast accuracy over time

---

## Troubleshooting

### Common Issues

#### 1. No Data Showing

**Possible Causes**:
- No orders in selected time period
- Filters too restrictive
- Database connection issue

**Solutions**:
- Clear all filters
- Expand time range
- Check database connection
- Contact support if issue persists

#### 2. Charts Not Loading

**Possible Causes**:
- Slow internet connection
- Browser compatibility
- JavaScript errors

**Solutions**:
- Refresh the page
- Check browser console for errors
- Try different browser
- Clear browser cache

#### 3. Forecast Not Available

**Possible Causes**:
- Insufficient historical data (need 18+ months)
- Data quality issues
- Algorithm fallback failed

**Solutions**:
- Wait for more data to accumulate
- Check data quality in database
- Use seasonal naive forecast if available
- Contact support for assistance

#### 4. Branch Filter Not Working

**Possible Causes**:
- Admin account missing branch assignment
- Branch name mismatch
- Permission issues

**Solutions**:
- Verify branch assignment in user profile
- Check branch name spelling
- Contact administrator for permission check

#### 5. Nexus Not Responding

**Possible Causes**:
- API connection issue
- Service temporarily unavailable
- Invalid query format

**Solutions**:
- Wait a moment and try again
- Check internet connection
- Rephrase your question
- Contact support if persistent

### Error Messages

**"Database connection not configured"**:
- Check server configuration
- Verify DATABASE_URL environment variable
- Contact system administrator

**"Failed to fetch analytics data"**:
- Check network connection
- Verify API endpoint is accessible
- Try refreshing the page
- Contact support if issue persists

**"Permission denied"**:
- Verify user role and permissions
- Check branch assignment (for admins)
- Contact administrator

### Getting Help

If you encounter issues not covered here:

1. **Check Console**: Browser developer console for errors
2. **Review Filters**: Ensure filters aren't too restrictive
3. **Refresh Page**: Simple refresh often resolves issues
4. **Contact Support**: Provide error messages and steps to reproduce

---

## Appendix

### Chart Types Reference

- **Line Chart**: Shows trends over time
- **Bar Chart**: Compares categories
- **Pie/Donut Chart**: Shows proportions
- **Heatmap**: Shows geographic density
- **Dual-Axis Chart**: Shows two metrics simultaneously

### Data Refresh

- **Automatic**: Data refreshes when filters change
- **Manual**: Refresh page to reload all data
- **Caching**: Some data cached for performance
- **Real-time**: Order data updates as orders are placed

### Browser Compatibility

Recommended browsers:
- Chrome (latest)
- Firefox (latest)
- Edge (latest)
- Safari (latest)

### Keyboard Shortcuts

- **Escape**: Close filter panel
- **Enter**: Submit search (when applicable)
- **Tab**: Navigate between elements

---

## Version Information

This manual covers the Analytics page as of the current version. Features may be added or modified in future updates.

**Last Updated**: [Current Date]

**For Questions or Feedback**: Contact your system administrator or support team.

---

## Quick Reference Guide

### Common Tasks

**View Sales Trends**:
1. Go to Sales tab
2. View "Total Sales Over Time" chart
3. Toggle monthly/yearly as needed

**Compare Branches**:
1. Go to Sales tab
2. View "Sales by Branch" chart
3. Use branch filter for specific comparison

**Check Order Status**:
1. Go to Sales tab
2. View "Order Pipeline Health" chart
3. Use order status filter if needed

**Get AI Insights**:
1. Click "Analyze" button
2. Or click chart-specific "Analyze"
3. Ask questions in Nexus chat

**View Forecast**:
1. Go to Sales tab
2. Scroll to "Sales Forecast" chart
3. Select forecast range
4. Review summary metrics

**Analyze Customers**:
1. Go to Customers tab
2. View customer summary
3. Check top customers chart

**View Geographic Data**:
1. Go to Geographic tab
2. View customer locations heatmap
3. Check city statistics

---

*End of User Manual*


