import React from 'react';
import SectionMessage from '@atlaskit/section-message';
import Button from '@atlaskit/button';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => {
  return (
    <div style={{ margin: '16px 0' }}>
      <SectionMessage title="An error occurred" appearance="error">
        <p>{message}</p>
        {onRetry && (
          <div style={{ marginTop: '12px' }}>
            <Button appearance="warning" onClick={onRetry}>
              Try again
            </Button>
          </div>
        )}
      </SectionMessage>
    </div>
  );
};
