import React from 'react';
import Spinner from '@atlaskit/spinner';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading data...',
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <Spinner size="large" />
      <p style={{ marginTop: '16px', color: '#6B778C', fontSize: '14px' }}>
        {message}
      </p>
    </div>
  );
};
