import React, { useState, useEffect } from 'react';
import './OrderProcessingModal.css';

const OrderProcessingModal = ({ isOpen, onClose, onError }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Validating Order',
      message: 'Reviewing your order details...',
      icon: '✓',
      duration: 800
    },
    {
      title: 'Processing Payment',
      message: 'Preparing payment information...',
      icon: '💳',
      duration: 1000
    },
    {
      title: 'Creating Order',
      message: 'Saving your order to our system...',
      icon: '📦',
      duration: 1500
    },
    {
      title: 'Sending Confirmation',
      message: 'Preparing confirmation email...',
      icon: '✉️',
      duration: 1200
    },
    {
      title: 'Almost Done',
      message: 'Finalizing your order...',
      icon: '⚡',
      duration: 1000
    }
  ];

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      return;
    }

    let stepIndex = 0;
    const stepTimers = [];

    const advanceStep = () => {
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        setCurrentStep(stepIndex);
        const timer = setTimeout(advanceStep, steps[stepIndex].duration);
        stepTimers.push(timer);
      }
    };

    // Start the first step
    const firstTimer = setTimeout(advanceStep, steps[0].duration);
    stepTimers.push(firstTimer);

    // Cleanup timers on unmount or close
    return () => {
      stepTimers.forEach(timer => clearTimeout(timer));
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="order-processing-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="order-processing-modal" onClick={(e) => e.stopPropagation()}>
        <div className="order-processing-header">
          <div className="order-processing-icon">
            <div className="spinning-loader">
              <div className="loader-circle"></div>
            </div>
          </div>
          <h2 className="order-processing-title">Processing Your Order</h2>
          <p className="order-processing-subtitle">Please wait while we process your order...</p>
        </div>

        <div className="order-processing-content">
          {/* Progress Bar */}
          <div className="order-progress-container">
            <div className="order-progress-bar">
              <div 
                className="order-progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <span className="order-progress-text">{Math.round(progress)}%</span>
          </div>

          {/* Current Step */}
          <div className="order-processing-step">
            <div className="step-icon-wrapper">
              <span className="step-icon">{currentStepData.icon}</span>
            </div>
            <div className="step-content">
              <h3 className="step-title">{currentStepData.title}</h3>
              <p className="step-message">{currentStepData.message}</p>
            </div>
          </div>

          {/* Steps List */}
          <div className="order-steps-list">
            {steps.map((step, index) => (
              <div 
                key={index} 
                className={`order-step-item ${index <= currentStep ? 'completed' : ''} ${index === currentStep ? 'active' : ''}`}
              >
                <div className="step-item-icon">
                  {index < currentStep ? (
                    <span className="check-icon">✓</span>
                  ) : index === currentStep ? (
                    <div className="pulse-dot"></div>
                  ) : (
                    <span className="pending-icon">{index + 1}</span>
                  )}
                </div>
                <div className="step-item-content">
                  <span className="step-item-title">{step.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="order-processing-footer">
          <p className="order-processing-note">
            <span className="note-icon">⏳</span>
            Please do not close this window or refresh the page
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderProcessingModal;

