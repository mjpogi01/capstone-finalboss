import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import { FaChartLine } from 'react-icons/fa';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import './EarningsChart.css';
import '../../pages/admin/Analytics.css';
import { API_URL } from '../../config/api';
import { authFetch } from '../../services/apiClient';
import { useAuth } from '../../contexts/AuthContext';

echarts.use([
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  BarChart,
  SVGRenderer
]);

const EarningsChart = ({ selectedBranchId = null, isValuesVisible = true, onToggleValues }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [salesTrends, setSalesTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily'); // 'daily', 'weekly', 'monthly', 'yearly'
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const chartInstanceRef = useRef(null);

  const formatNumber = (num) => {
    if (num === null || num === undefined || Number.isNaN(num)) {
      return '0';
    }
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  // Fetch sales trends based on period
  useEffect(() => {
    // Wait for auth to stabilize before making API requests
    if (authLoading || !user) {
      return;
    }

    const fetchSalesTrends = async () => {
      try {
        setLoading(true);
        // Build URL with period and branch_id if provided
        let url = `${API_URL}/api/analytics/sales-trends?period=${period}`;
        if (selectedBranchId) {
          url += `&branch_id=${encodeURIComponent(selectedBranchId)}`;
        }
        
        const response = await authFetch(url);
        const result = await response.json();
        
        if (result.success && Array.isArray(result.data)) {
          setSalesTrends(result.data);
        } else {
          setSalesTrends([]);
        }
      } catch (error) {
        console.error('Error fetching sales trends:', error);
        setSalesTrends([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesTrends();
  }, [selectedBranchId, authLoading, user, period]);

  // Track window width for responsive chart configuration
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Resize chart when visibility changes, period changes, or window resizes
  useEffect(() => {
    const resizeChart = () => {
      if (chartInstanceRef.current && typeof chartInstanceRef.current.resize === 'function') {
        setTimeout(() => {
          try {
            chartInstanceRef.current.resize();
          } catch (error) {
            // Ignore resize errors
          }
        }, 100);
      }
    };

    resizeChart();
    window.addEventListener('resize', resizeChart);
    return () => window.removeEventListener('resize', resizeChart);
  }, [isValuesVisible, period, windowWidth]);

  // Callback when chart is ready
  const onChartReady = (chartInstance) => {
    if (chartInstance) {
      chartInstanceRef.current = chartInstance;
      setTimeout(() => {
        if (chartInstance.resize) {
          chartInstance.resize();
        }
      }, 50);
    }
  };

  // Check if we have data
  const hasData = useMemo(() => {
    const trends = Array.isArray(salesTrends) ? salesTrends : [];
    const salesValues = trends.map(item => Number(item.sales || 0));
    const ordersValues = trends.map(item => Number(item.orders || 0));
    return trends.length > 0 &&
      (salesValues.some(value => value > 0) || ordersValues.some(value => value > 0));
  }, [salesTrends]);

  // Format date based on period
  const formatDateLabel = (rawDate, periodType) => {
    if (!rawDate) return '';
    
    // Handle different date formats from API
    let parsed;
    if (typeof rawDate === 'string') {
      // Try parsing as ISO string or date string
      parsed = new Date(rawDate);
      if (Number.isNaN(parsed.getTime())) {
        // Try parsing as YYYY-MM-DD format
        const parts = rawDate.split('-');
        if (parts.length >= 2) {
          parsed = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2] || 1));
        }
      }
    } else if (rawDate instanceof Date) {
      parsed = rawDate;
    } else {
      parsed = new Date(rawDate);
    }
    
    if (Number.isNaN(parsed.getTime())) {
      return String(rawDate);
    }
    
    switch (periodType) {
      case 'daily':
        return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'weekly':
        // Format as "MM/DD - MM/DD" for week range
        const weekStart = new Date(parsed);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      case 'monthly':
        return parsed.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      case 'yearly':
        return parsed.toLocaleDateString('en-US', { year: 'numeric' });
      default:
        return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Get chart title based on period
  const getChartTitle = () => {
    const periodLabels = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly'
    };
    return `${periodLabels[period] || 'Daily'} Sales & Orders`;
  };

  // Prepare chart data - Sales & Orders with dual axis
  const chartOption = useMemo(() => {
    const trends = Array.isArray(salesTrends) ? salesTrends : [];
    
    // Filter out 2021 data - only include data from 2022 onwards
    const filteredTrends = trends.filter(item => {
      const rawDate = item.date || item.day || item.period || item.week || item.month || item.year;
      if (!rawDate) return false;
      
      const date = new Date(rawDate);
      if (Number.isNaN(date.getTime())) return false;
      
      // Only include dates from 2022 onwards
      return date.getFullYear() >= 2022;
    });
    
    const categories = filteredTrends.map(item => {
      const rawDate = item.date || item.day || item.period || item.week || item.month || item.year;
      return formatDateLabel(rawDate, period);
    });
    const salesValues = filteredTrends.map(item => Number(item.sales || 0));
    const ordersValues = filteredTrends.map(item => Number(item.orders || 0));

    // Responsive configuration based on number of data points
    const dataPointCount = categories.length;
    const isMobile = windowWidth < 768;
    const isTablet = windowWidth >= 768 && windowWidth < 1024;
    
    // Calculate grid margins responsively
    const getGridConfig = () => {
      if (isMobile) {
        return {
          left: '15%',
          right: '8%',
          bottom: dataPointCount > 7 ? '20%' : '15%',
          top: '15%',
          containLabel: true
        };
      } else if (isTablet) {
        return {
          left: '12%',
          right: '6%',
          bottom: dataPointCount > 10 ? '18%' : '12%',
          top: '12%',
          containLabel: true
        };
      } else {
        return {
          left: '8%',
          right: '8%',
          bottom: dataPointCount > 15 ? '15%' : '12%',
          top: '10%',
          containLabel: true
        };
      }
    };

    // Calculate xAxis label rotation and interval
    const getXAxisConfig = () => {
      const needsRotation = dataPointCount > 7 || isMobile;
      const labelInterval = isMobile 
        ? (dataPointCount > 10 ? 'auto' : 0)
        : (dataPointCount > 20 ? 'auto' : 0);
      
      return {
        rotate: needsRotation ? (isMobile ? 45 : 30) : 0,
        interval: labelInterval,
        fontSize: isMobile ? 10 : 12,
        width: needsRotation ? (isMobile ? 60 : 80) : undefined,
        overflow: 'truncate',
        ellipsis: '...'
      };
    };

    const xAxisLabelConfig = getXAxisConfig();
    const gridConfig = getGridConfig();

    return {
      animation: hasData,
      animationDuration: hasData ? 600 : 0,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#111827',
        borderColor: '#1f2937',
        textStyle: { color: '#f9fafb', fontSize: isMobile ? 12 : 14 },
        formatter: (params) => {
          try {
          if (!isValuesVisible) return '';
          if (!Array.isArray(params) || !params.length) return '';
            const firstParam = params[0];
            if (!firstParam || firstParam.axisValue === undefined) return '';
            const lines = params
              .filter(point => point && point.seriesName)
              .map(point => {
            if (point.seriesName === 'Sales') {
                  return `${point.marker || ''}${point.seriesName}: ₱${formatNumber(point.data ?? 0)}`;
            }
                return `${point.marker || ''}${point.seriesName}: ${formatNumber(point.data ?? 0)}`;
          });
            return [`${firstParam.axisValue}`, ...lines].join('<br/>');
          } catch (error) {
            console.warn('Tooltip formatter error:', error);
            return '';
          }
        }
      },
      legend: {
        data: ['Sales', 'Orders'],
        top: isMobile ? '5%' : '3%',
        left: isMobile ? 'center' : 'auto',
        right: isMobile ? 'auto' : '8%',
        itemWidth: isMobile ? 12 : 14,
        itemHeight: isMobile ? 8 : 10,
        itemGap: isMobile ? 8 : 12,
        textStyle: { 
          color: '#4b5563',
          fontSize: isMobile ? 11 : 12
        },
        type: 'scroll',
        orient: isMobile ? 'horizontal' : 'horizontal'
      },
      grid: gridConfig,
      xAxis: {
        type: 'category',
        boundaryGap: true,
        data: categories,
        axisLabel: { 
          color: '#6b7280',
          rotate: xAxisLabelConfig.rotate,
          interval: xAxisLabelConfig.interval,
          fontSize: xAxisLabelConfig.fontSize,
          width: xAxisLabelConfig.width,
          overflow: xAxisLabelConfig.overflow,
          ellipsis: xAxisLabelConfig.ellipsis,
          margin: isMobile ? 8 : 10
        },
        axisLine: { lineStyle: { color: '#d1d5db' } },
        axisTick: { 
          alignWithLabel: true,
          length: isMobile ? 4 : 5
        }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Sales',
          nameLocation: 'middle',
          nameGap: isMobile ? 35 : 50,
          nameTextStyle: {
            fontSize: isMobile ? 11 : 12,
            color: '#6b7280'
          },
          axisLabel: {
            color: '#6b7280',
            fontSize: isMobile ? 10 : 11,
            formatter: isValuesVisible ? (value) => `₱${formatNumber(value)}` : () => '•••',
            margin: isMobile ? 5 : 8,
            width: isMobile ? 40 : 50,
            overflow: 'truncate',
            ellipsis: '...'
          },
          splitLine: { lineStyle: { color: '#e5e7eb' } }
        },
        {
          type: 'value',
          name: 'Orders',
          nameLocation: 'middle',
          nameGap: isMobile ? 35 : 50,
          nameTextStyle: {
            fontSize: isMobile ? 11 : 12,
            color: '#6b7280'
          },
          axisLabel: { 
            color: '#6b7280', 
            fontSize: isMobile ? 10 : 11,
            formatter: isValuesVisible ? (value) => formatNumber(value) : () => '•••',
            margin: isMobile ? 5 : 8,
            width: isMobile ? 30 : 40,
            overflow: 'truncate',
            ellipsis: '...'
          },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: 'Sales',
          type: 'bar',
          yAxisIndex: 0,
          barWidth: isMobile ? '25%' : (isTablet ? '30%' : '35%'),
          barGap: isMobile ? '10%' : '15%',
          data: salesValues,
          itemStyle: {
            color: '#0284c7',
            borderRadius: [4, 4, 0, 0]
          },
          animation: hasData,
          animationDuration: hasData ? 600 : 0,
          emphasis: {
            focus: 'series',
            itemStyle: {
              color: '#0369a1'
            }
          }
        },
        {
          name: 'Orders',
          type: 'bar',
          yAxisIndex: 1,
          barWidth: isMobile ? '25%' : (isTablet ? '30%' : '35%'),
          barGap: isMobile ? '10%' : '15%',
          data: ordersValues,
          itemStyle: {
            color: '#0d9488',
            borderRadius: [4, 4, 0, 0]
          },
          animation: hasData,
          animationDuration: hasData ? 600 : 0,
          emphasis: {
            focus: 'series',
            itemStyle: {
              color: '#0f766e'
            }
          }
        }
      ],
      barCategoryGap: isMobile ? '15%' : '20%'
    };
  }, [salesTrends, isValuesVisible, hasData, period, windowWidth]);

  const chartHeights = {
    base: '100%'
  };

  return (
    <div className="analytics-card geo-distribution-card">
      <div className="card-header">
        <FaChartLine className="card-icon" />
        <h3>{getChartTitle()}</h3>
        <div className="card-controls">
          {/* Period Filter Buttons */}
          <div className="earnings-chart-period-filters">
            <button
              className={`period-filter-btn ${period === 'daily' ? 'active' : ''}`}
              onClick={() => setPeriod('daily')}
              title="Daily view"
            >
              Daily
            </button>
            <button
              className={`period-filter-btn ${period === 'weekly' ? 'active' : ''}`}
              onClick={() => setPeriod('weekly')}
              title="Weekly view"
            >
              Weekly
            </button>
            <button
              className={`period-filter-btn ${period === 'monthly' ? 'active' : ''}`}
              onClick={() => setPeriod('monthly')}
              title="Monthly view"
            >
              Monthly
            </button>
            <button
              className={`period-filter-btn ${period === 'yearly' ? 'active' : ''}`}
              onClick={() => setPeriod('yearly')}
              title="Yearly view"
            >
              Yearly
            </button>
          </div>
          {onToggleValues && (
            <button
              className="dashboard1-chart-toggle-btn"
              onClick={onToggleValues}
              title={isValuesVisible ? 'Hide values' : 'Show values'}
              aria-label={isValuesVisible ? 'Hide values' : 'Show values'}
            >
              <FontAwesomeIcon 
                icon={isValuesVisible ? faEyeSlash : faEye} 
                className="dashboard1-chart-toggle-icon"
              />
            </button>
          )}
        </div>
      </div>
      <div className="chart-container">
        {loading ? (
          <div className="analytics-loading-inline">
            <div className="loading-spinner"></div>
            <p>Loading sales data...</p>
          </div>
        ) : !hasData ? (
          <div className="chart-empty-state">
            <p>No sales data available</p>
          </div>
        ) : (
          <>
            <ReactEChartsCore
              echarts={echarts}
              option={chartOption}
              notMerge
              lazyUpdate
              opts={{ renderer: 'svg' }}
              style={{ height: chartHeights.base, width: '100%', minHeight: '300px', maxHeight: '100%', maxWidth: '100%', minWidth: '0' }}
              onChartReady={onChartReady}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default EarningsChart;
