import React from 'react';
import { useFlags } from 'launchdarkly-react-client-sdk';
import './AnnouncementBanner.css'; // We'll create a simple CSS file for it

const AnnouncementBanner = () => {
  const { announcementBannerEnabled, announcementMessage } = useFlags();

  console.log('LD Flags:', { announcementBannerEnabled, announcementMessage });

  if (!announcementBannerEnabled) {
    return null;
  }

  return (
    <div className="announcement-banner">
      <p>{announcementMessage || "Welcome to our Forum!"}</p>
    </div>
  );
};

export default AnnouncementBanner;
