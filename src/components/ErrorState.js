import React from 'react';
import './Loading.css';

const ErrorState = ({ message = 'Something went wrong.', onRetry, retryLabel = 'Retry' }) => {
  return (
    <div className="error-state" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="retry-btn">
          {retryLabel}
        </button>
      )}
    </div>
  );
};

export default ErrorState;


