import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './ArtistWorkloadChart.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChartBar
} from '@fortawesome/free-solid-svg-icons';
import ReactECharts from 'echarts-for-react';
import { useAuth } from '../../contexts/AuthContext';
import artistDashboardService from '../../services/artistDashboardService';

const ArtistWorkloadChart = ({
  fullWidth = false,
  showHeader = true,
  period = null,
  onPeriodChange = null,
  onSummaryChange = null,
  dataRefreshToken = 0
}) => {
  const [workloadData, setWorkloadData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const { user } = useAuth();
  const chartRef = useRef(null);

  const fetchWorkloadData = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        console.warn('No user ID available');
        setWorkloadData([]);
        return;
      }

      const data = await artistDashboardService.getArtistWorkload(selectedPeriod);
      setWorkloadData(data);
    } catch (error) {
      console.error('Error fetching workload data:', error);
      setWorkloadData([]);
    } finally {
      setLoading(false);
    }
  }, [user, selectedPeriod, dataRefreshToken]);

  useEffect(() => {
    // keep internal state in sync when controlled period provided
    if (period && period !== selectedPeriod) {
      setSelectedPeriod(period);
    }
  }, [period]);

  useEffect(() => {
    fetchWorkloadData();
  }, [selectedPeriod, fetchWorkloadData, dataRefreshToken]);

  // Handle resize for responsive chart (both window and container resize)
  useEffect(() => {
    if (loading) return; // Don't set up resize handler while loading

    let resizeFrame = null;
    let resizeTimeout = null;

    const handleResize = () => {
      // Cancel any pending resize
      if (resizeFrame) {
        window.cancelAnimationFrame(resizeFrame);
      }
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }

      // Use requestAnimationFrame to batch resize calls and prevent ResizeObserver loops
      resizeFrame = window.requestAnimationFrame(() => {
        if (chartRef.current) {
          const echartsInstance = chartRef.current.getEchartsInstance();
          if (echartsInstance) {
            try {
              echartsInstance.resize();
            } catch (error) {
              // Silently handle resize errors (common with ResizeObserver loops)
              console.debug('Chart resize error (harmless):', error);
            }
          }
        }
      });
    };

    // Handle window resize with debouncing
    const debouncedWindowResize = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedWindowResize);
    
    // Handle container resize using ResizeObserver
    // Wait a bit for the chart to mount
    const timeoutId = setTimeout(() => {
      if (chartRef.current) {
        const chartElement = chartRef.current.ele;
        if (chartElement && window.ResizeObserver) {
          const resizeObserver = new ResizeObserver((entries) => {
            // Use requestAnimationFrame to prevent ResizeObserver loop errors
            if (resizeFrame) {
              window.cancelAnimationFrame(resizeFrame);
            }
            resizeFrame = window.requestAnimationFrame(() => {
              handleResize();
            });
          });
          resizeObserver.observe(chartElement);
          
          // Store observer for cleanup
          chartRef.current._resizeObserver = resizeObserver;
        }
      }
    }, 100);

    return () => {
      window.removeEventListener('resize', debouncedWindowResize);
      clearTimeout(timeoutId);
      if (resizeFrame) {
        window.cancelAnimationFrame(resizeFrame);
      }
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      if (chartRef.current?._resizeObserver) {
        try {
          if (chartRef.current.ele) {
            chartRef.current._resizeObserver.unobserve(chartRef.current.ele);
          }
          if (typeof chartRef.current._resizeObserver.disconnect === 'function') {
            chartRef.current._resizeObserver.disconnect();
          }
        } catch (observerError) {
          console.debug('ResizeObserver cleanup error:', observerError);
        } finally {
          chartRef.current._resizeObserver = null;
        }
      }
    };
  }, [loading, workloadData]); // Re-run when loading completes or data changes

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getTotalTasks = () => {
    const latest = workloadData[workloadData.length - 1];
    return latest ? latest.pending + latest.in_progress + latest.completed : 0;
  };

  const dates = useMemo(() => workloadData.map(d => formatDate(d.date)), [workloadData]);
  const pendingData = useMemo(() => workloadData.map(d => d.pending || 0), [workloadData]);
  const inProgressData = useMemo(() => workloadData.map(d => d.in_progress || 0), [workloadData]);
  const completedData = useMemo(() => workloadData.map(d => d.completed || 0), [workloadData]);
  const totals = useMemo(
    () => workloadData.map(d => (d.pending || 0) + (d.in_progress || 0) + (d.completed || 0)),
    [workloadData]
  );

  const getSummaryIndex = () => {
    if (hoveredIndex != null && hoveredIndex >= 0 && hoveredIndex < workloadData.length) {
      return hoveredIndex;
    }
    return workloadData.length > 0 ? workloadData.length - 1 : 0;
  };

  const summaryIndex = getSummaryIndex();
  const summaryTotal = totals[summaryIndex] || 0;
  const summaryDate = dates[summaryIndex] || '';

  // Notify parent (dashboard) about current summary so it can render externally
  useEffect(() => {
    if (onSummaryChange) {
      onSummaryChange({ date: summaryDate, total: summaryTotal });
    }
  }, [summaryDate, summaryTotal, onSummaryChange]);

  const chartOption = useMemo(() => {
    if (!workloadData || workloadData.length === 0) {
      return {
        title: {
          text: 'No Data Available',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: '#999',
            fontSize: 14
          }
        }
      };
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params) {
          try {
            if (!Array.isArray(params) || !params.length) return '';
            const firstParam = params[0];
            if (!firstParam) return '';
            const xLabel = firstParam.axisValue || '';
            let result = `<div style="margin-bottom:4px;"><strong>${xLabel}</strong></div>`;
            let pending = 0, inProg = 0, completed = 0;
            params
              .filter(p => p && p.seriesName)
              .forEach(p => {
                const value = p.value ?? 0;
                result += `${p.marker || ''} ${p.seriesName}: <strong>${value}</strong><br/>`;
                if (p.seriesName === 'Pending') pending = value;
                if (p.seriesName === 'In Progress') inProg = value;
                if (p.seriesName === 'Completed') completed = value;
              });
            const total = pending + inProg + completed;
            result += `<hr style="border:none;border-top:1px solid #e5e7eb;margin:6px 0;" />`;
            result += `Total: <strong>${total}</strong>`;
            return result;
          } catch (error) {
            console.warn('Tooltip formatter error:', error);
            return '';
          }
        }
      },
      legend: {
        data: ['Pending', 'In Progress', 'Completed'],
        bottom: 0,
        textStyle: {
          fontSize: 12
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '22%',
        top: '16%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          fontSize: 11,
          interval: 0,
          rotate: dates.length > 7 ? 30 : 0
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          fontSize: 11
        },
        name: 'Tasks',
        nameTextStyle: { padding: [0, 0, 0, 0], color: '#6b7280' },
        splitLine: { lineStyle: { color: '#e5e7eb' } }
      },
      series: [
        {
          name: 'Pending',
          type: 'bar',
          data: pendingData,
          barWidth: '20%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#9ca3af' },
                { offset: 1, color: '#6b7280' }
              ]
            },
            borderRadius: [4, 4, 0, 0]
          },
          emphasis: { focus: 'series' }
        },
        {
          name: 'In Progress',
          type: 'bar',
          data: inProgressData,
          barWidth: '20%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#60a5fa' },
                { offset: 1, color: '#2563eb' }
              ]
            },
            borderRadius: [4, 4, 0, 0]
          },
          emphasis: { focus: 'series' }
        },
        {
          name: 'Completed',
          type: 'bar',
          data: completedData,
          barWidth: '20%',
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#34d399' },
                { offset: 1, color: '#059669' }
              ]
            },
            borderRadius: [4, 4, 0, 0]
          },
          emphasis: { focus: 'series' }
        }
      ],
      barCategoryGap: '20%'
    };
  }, [workloadData, dates, pendingData, inProgressData, completedData]);

  if (loading) {
    return (
      <div className={`workload-chart ${fullWidth ? 'full-width' : ''}`}>
        {showHeader && (
          <div className="chart-header">
            <h3><FontAwesomeIcon icon={faChartBar} /> Workload Overview</h3>
            <div className="chart-controls">
              <select 
                value={period ?? selectedPeriod}
                onChange={(e) => {
                  const value = e.target.value;
                  if (onPeriodChange) onPeriodChange(value);
                  setSelectedPeriod(value);
                }}
                className="period-select"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </select>
            </div>
          </div>
        )}
        <div className="loading-skeleton" style={{ height: '300px', borderRadius: '12px' }}></div>
      </div>
    );
  }

  return (
    <div className={`workload-chart ${fullWidth ? 'full-width' : ''}`}>
      {showHeader && (
        <div className="chart-header">
          <h3><FontAwesomeIcon icon={faChartBar} /> Workload Overview</h3>
          <div className="chart-controls">
            <select 
              value={period ?? selectedPeriod}
              onChange={(e) => {
                const value = e.target.value;
                if (onPeriodChange) onPeriodChange(value);
                setSelectedPeriod(value);
              }}
              className="period-select"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          </div>
        </div>
      )}

      <div className="chart-content">
        <div className="chart-visualization">
          <ReactECharts
            ref={chartRef}
            option={chartOption}
            style={{ width: '100%', height: '100%', minHeight: '250px' }}
            opts={{ renderer: 'canvas' }}
            autoResize={false}
            notMerge={true}
            lazyUpdate={true}
            onEvents={{
              mouseover: (p) => {
                if (typeof p?.dataIndex === 'number') {
                  setHoveredIndex(p.dataIndex);
                  return;
                }
                if (typeof p?.name === 'string') {
                  const idx = dates.indexOf(p.name);
                  if (idx >= 0) setHoveredIndex(idx);
                }
              },
              globalout: () => setHoveredIndex(null),
              click: (p) => {
                if (typeof p?.dataIndex === 'number') {
                  setHoveredIndex(p.dataIndex);
                  return;
                }
                if (p?.componentType === 'xAxis' && typeof p?.value !== 'undefined') {
                  const idx = dates.indexOf(p.value);
                  if (idx >= 0) setHoveredIndex(idx);
                  return;
                }
                if (typeof p?.name === 'string') {
                  const idx = dates.indexOf(p.name);
                  if (idx >= 0) setHoveredIndex(idx);
                }
              },
              updateAxisPointer: (e) => {
                const ax = e?.axesInfo && e.axesInfo[0];
                if (ax) {
                  if (typeof ax?.value !== 'undefined') {
                    const idx = dates.indexOf(ax.value);
                    if (idx >= 0) {
                      setHoveredIndex(idx);
                      return;
                    }
                  }
                  if (typeof ax?.dataIndex === 'number') {
                    setHoveredIndex(ax.dataIndex);
                  }
                }
              }
            }}
          />
        </div>

        {!onSummaryChange && (
          <div className="chart-summary">
            <div className="summary-item">
              <span className="summary-label">Date:</span>
              <span className="summary-value">{summaryDate || '-'}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Tasks:</span>
              <span className="summary-value">{summaryTotal}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistWorkloadChart;
