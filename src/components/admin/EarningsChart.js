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

echarts.use([
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  BarChart,
  SVGRenderer
]);

const EarningsChart = ({ selectedBranchId = null, isValuesVisible = true, onToggleValues }) => {
  const [salesTrends, setSalesTrends] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // Fetch daily sales trends
  useEffect(() => {
    const fetchSalesTrends = async () => {
      try {
        setLoading(true);
        // Build URL with branch_id if provided (for owners filtering by specific branch)
        let url = `${API_URL}/api/analytics/sales-trends?period=30`;
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
  }, [selectedBranchId]);

  // Resize chart when visibility changes or window resizes
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
  }, [isValuesVisible]);

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

  // Prepare chart data - Daily Sales & Orders with dual axis
  const chartOption = useMemo(() => {
    const trends = Array.isArray(salesTrends) ? salesTrends : [];
    const categories = trends.map(item => {
      const rawDate = item.date || item.day || item.period;
      if (!rawDate) {
        return '';
      }
      const parsed = new Date(rawDate);
      if (Number.isNaN(parsed.getTime())) {
        return rawDate;
      }
      return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const salesValues = trends.map(item => Number(item.sales || 0));
    const ordersValues = trends.map(item => Number(item.orders || 0));

    return {
      animation: hasData,
      animationDuration: hasData ? 600 : 0,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#111827',
        borderColor: '#1f2937',
        textStyle: { color: '#f9fafb' },
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
        top: 0,
        textStyle: { color: '#4b5563' }
      },
      grid: { left: '4%', right: '5%', bottom: '10%', top: '14%', containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: true,
        data: categories,
        axisLabel: { 
          color: '#6b7280',
          rotate: categories.length > 10 ? 45 : 0,
          interval: 0
        },
        axisLine: { lineStyle: { color: '#d1d5db' } },
        axisTick: { alignWithLabel: true }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Sales',
          axisLabel: {
            color: '#6b7280',
            formatter: isValuesVisible ? (value) => `₱${formatNumber(value)}` : () => '•••'
          },
          splitLine: { lineStyle: { color: '#e5e7eb' } }
        },
        {
          type: 'value',
          name: 'Orders',
          axisLabel: { 
            color: '#6b7280', 
            formatter: isValuesVisible ? (value) => formatNumber(value) : () => '•••'
          },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: 'Sales',
          type: 'bar',
          yAxisIndex: 0,
          barWidth: '35%',
          data: salesValues,
          itemStyle: {
            color: '#6366f1',
            borderRadius: [4, 4, 0, 0]
          },
          animation: hasData,
          animationDuration: hasData ? 600 : 0,
          emphasis: {
            focus: 'series',
            itemStyle: {
              color: '#4f46e5'
            }
          }
        },
        {
          name: 'Orders',
          type: 'bar',
          yAxisIndex: 1,
          barWidth: '35%',
          data: ordersValues,
          itemStyle: {
            color: '#f97316',
            borderRadius: [4, 4, 0, 0]
          },
          animation: hasData,
          animationDuration: hasData ? 600 : 0,
          emphasis: {
            focus: 'series',
            itemStyle: {
              color: '#ea580c'
            }
          }
        }
      ],
      barCategoryGap: '20%'
    };
  }, [salesTrends, isValuesVisible, hasData]);

  const chartHeights = {
    base: '420px'
  };

  return (
    <div className="analytics-card geo-distribution-card">
      <div className="card-header">
        <FaChartLine className="card-icon" />
        <h3>Daily Sales & Orders</h3>
        <div className="card-controls">
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
              style={{ height: chartHeights.base, width: '100%', minHeight: '380px' }}
              onChartReady={onChartReady}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default EarningsChart;
