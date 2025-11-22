import React, { useState, useEffect, useCallback } from 'react';
import './ArtistMetricsCards.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTasks, 
  faClock, 
  faCheckCircle, 
  faChartLine 
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/AuthContext';
import artistDashboardService from '../../services/artistDashboardService';

const ArtistMetricsCards = ({ refreshToken = 0 }) => {
  const [metrics, setMetrics] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    averageCompletionTime: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchArtistMetrics = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        console.warn('No user ID available');
        setMetrics({
          totalTasks: 0,
          pendingTasks: 0,
          completedTasks: 0,
          averageCompletionTime: 0
        });
        return;
      }

      const metricsData = await artistDashboardService.getArtistMetrics();
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error fetching artist metrics:', error);
      // Set default values on error
      setMetrics({
        totalTasks: 0,
        pendingTasks: 0,
        completedTasks: 0,
        averageCompletionTime: 0
      });
    } finally {
      setLoading(false);
    }
  }, [user, refreshToken]);

  useEffect(() => {
    fetchArtistMetrics();
  }, [fetchArtistMetrics]);

  const cards = [
    {
      title: 'Total Tasks',
      value: metrics.totalTasks,
      icon: faTasks,
      color: '#3b82f6',
      bgColor: '#dbeafe'
    },
    {
      title: 'Pending Tasks',
      value: metrics.pendingTasks,
      icon: faClock,
      color: '#f59e0b',
      bgColor: '#fef3c7'
    },
    {
      title: 'Completed',
      value: metrics.completedTasks,
      icon: faCheckCircle,
      color: '#10b981',
      bgColor: '#d1fae5'
    },
    {
      title: 'Avg. Completion Time',
      value: `${metrics.averageCompletionTime > 0 ? metrics.averageCompletionTime : '0'} hrs`,
      icon: faClock,
      color: '#8b5cf6',
      bgColor: '#ede9fe'
    }
  ];

  if (loading) {
    return (
      <div className="artist-metrics-cards">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="artist-metric-card artist-loading-skeleton">
            <div className="artist-card-content">
              <div className="artist-card-icon artist-loading-skeleton" style={{ width: '48px', height: '48px', borderRadius: '12px' }}></div>
              <div className="artist-card-info">
                <div className="artist-card-title artist-loading-skeleton" style={{ width: '80px', height: '16px', marginBottom: '8px' }}></div>
                <div className="artist-card-value artist-loading-skeleton" style={{ width: '60px', height: '24px', marginBottom: '4px' }}></div>
                <div className="artist-card-change artist-loading-skeleton" style={{ width: '40px', height: '14px' }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="artist-metrics-cards">
      {cards.map((card, index) => (
        <div key={index} className="artist-metric-card">
          <div className="artist-card-content">
            <div 
              className="artist-card-icon"
              style={{ 
                backgroundColor: card.bgColor,
                color: card.color 
              }}
            >
              <FontAwesomeIcon icon={card.icon} />
            </div>
            
            <div className="artist-card-info">
              <h3 className="artist-card-title">{card.title}</h3>
              <div className="artist-card-value">{card.value}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ArtistMetricsCards;
