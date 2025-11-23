import React, { useEffect, useRef } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';

/**
 * Safe wrapper for ReactEChartsCore that handles ResizeObserver cleanup errors
 * This prevents the "Cannot read properties of undefined (reading 'disconnect')" error
 * that occurs when components unmount before ResizeObserver is fully initialized
 */
const SafeEChartsCore = (props) => {
  const chartRef = useRef(null);
  const isUnmounting = useRef(false);

  useEffect(() => {
    // Mark as unmounting when component is about to unmount
    return () => {
      isUnmounting.current = true;
      
      // Safely dispose of the chart instance before the library tries to clean up
      try {
        if (chartRef.current) {
          const echartsInstance = chartRef.current.getEchartsInstance?.();
          if (echartsInstance && typeof echartsInstance.dispose === 'function') {
            echartsInstance.dispose();
          }
          
          // Clear any ResizeObserver references to prevent errors
          if (chartRef.current.ele) {
            const element = chartRef.current.ele;
            // Try to clean up any observers manually
            if (element._resizeObserver) {
              try {
                if (element._resizeObserver.disconnect) {
                  element._resizeObserver.disconnect();
                }
                element._resizeObserver = null;
              } catch (e) {
                // Ignore cleanup errors
              }
            }
          }
        }
      } catch (error) {
        // Silently handle any disposal errors - these are harmless
        console.debug('SafeEChartsCore: Error during chart disposal (harmless):', error);
      }
    };
  }, []);

  const { onChartReady, ...restProps } = props;
  
  // Wrap onChartReady to store the ref
  const wrappedOnChartReady = (chartInstance) => {
    if (chartRef.current && chartInstance) {
      // Store the echarts instance for cleanup
      chartRef.current._echartsInstance = chartInstance;
    }
    if (onChartReady) {
      onChartReady(chartInstance);
    }
  };

  return (
    <ReactEChartsCore
      {...restProps}
      ref={chartRef}
      onChartReady={wrappedOnChartReady}
    />
  );
};

export default SafeEChartsCore;

