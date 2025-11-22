import React, { useState, useEffect } from 'react';
import './MetricsCards.css';
import API_URL from '../../config/api';
import { authFetch } from '../../services/apiClient';

const MetricsCards = () => {
  const [metrics, setMetrics] = useState([
    {
      title: 'Total Sales',
      value: 'P0',
      change: '+0%',
      icon: 'currency',
      color: 'green'
    },
    {
      title: 'Total Customers',
      value: '0',
      change: '+0%',
      icon: 'person',
      color: 'blue'
    },
    {
      title: 'Total Orders',
      value: '0',
      change: '+0%',
      icon: 'cart',
      color: 'purple'
    }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetricsData();
  }, []);

  const fetchMetricsData = async () => {
    try {
      setLoading(true);
      
      // Fetch analytics data from API
      const response = await authFetch(`${API_URL}/api/analytics/dashboard`);
      const result = await response.json();
      
      if (result.success && result.data) {
        const data = result.data;
        
        // Calculate metrics from real data
        const totalRevenue = data.summary?.totalRevenue || 0;
        const totalOrders = data.summary?.totalOrders || 0;
        const totalCustomers = data.summary?.totalCustomers || 0;
        
        // Calculate percentage changes (mock calculation for now)
        const revenueChange = totalRevenue > 0 ? '+12%' : '+0%';
        const ordersChange = totalOrders > 0 ? '+8%' : '+0%';
        const customersChange = totalCustomers > 0 ? '+15%' : '+0%';
        
        setMetrics([
          {
            title: 'Total Sales',
            value: `P${totalRevenue.toLocaleString()}`,
            change: revenueChange,
            icon: 'currency',
            color: 'green'
          },
          {
            title: 'Total Customers',
            value: totalCustomers.toString(),
            change: customersChange,
            icon: 'person',
            color: 'blue'
          },
          {
            title: 'Total Orders',
            value: totalOrders.toString(),
            change: ordersChange,
            icon: 'cart',
            color: 'purple'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching metrics data:', error);
      // Keep default values on error
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="metrics-cards-container">
        <div className="metrics-cards">
          {[1, 2, 3].map((index) => (
            <div key={index} className="metric-card loading">
              <div className="metric-card-content">
                <div className="metric-header">
                  <div className="metric-icon">
                    <div className="loading-skeleton"></div>
                  </div>
                  <div className="metric-change">
                    <div className="loading-skeleton"></div>
                  </div>
                </div>
                <div className="metric-content">
                  <div className="metric-value">
                    <div className="loading-skeleton"></div>
                  </div>
                  <div className="metric-title">
                    <div className="loading-skeleton"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="metrics-cards-container">
      <div className="metrics-cards">
        {metrics.map((metric, index) => (
          <div key={index} className={`metric-card ${metric.color}`}>
            <div className="metric-card-content">
              <div className="metric-header">
                <div className="metric-icon">
                  {metric.icon === 'currency' && (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  )}
                  {metric.icon === 'person' && (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  )}
                  {metric.icon === 'cart' && (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7 4V2C7 1.45 7.45 1 8 1H16C16.55 1 17 1.45 17 2V4H20C20.55 4 21 4.45 21 5S20.55 6 20 6H19V19C19 20.1 18.1 21 17 21H7C5.9 21 5 20.1 5 19V6H4C3.45 6 3 5.55 3 5S3.45 4 4 4H7ZM9 3V4H15V3H9ZM7 6V19H17V6H7Z"/>
                    </svg>
                  )}
                </div>
                <div className="metric-change">{metric.change}</div>
              </div>
              <div className="metric-content">
                <div className="metric-value">{metric.value}</div>
                <div className="metric-title">{metric.title}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MetricsCards;
