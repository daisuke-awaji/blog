import Script from 'next/script';
import React from 'react';
import { existsGaId, GA_TRACKING_ID } from './gtag';

const GoogleAnalytics: React.FC = () => (
  <>
    {existsGaId && (
      <>
        <Script
          defer
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga" defer strategy="afterInteractive">
          {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_TRACKING_ID}');
          `}
        </Script>
      </>
    )}
  </>
);

export default GoogleAnalytics;
