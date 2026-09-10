import React from 'react';

interface PopunderHandlerProps {
  enabled?: boolean;
  intervalMinutes?: number;
  userId?: string;
  smartlinkUrl?: string;
}

/**
 * PopunderHandler is disabled permanently per user configuration.
 * Auto 4-minute ad popunders and background triggers are fully removed.
 */
export const PopunderHandler: React.FC<PopunderHandlerProps> = () => {
  return null;
};



