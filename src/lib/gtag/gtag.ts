export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

export const existsGaId = GA_TRACKING_ID !== '';

type ContactEvent = {
  action: 'submit_form';
  category: 'contact';
  label: string;
};

type ClickEvent = {
  action: 'click';
  category: 'other';
  label: string;
};

export type Event = ContactEvent | ClickEvent;

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (path: string) => {
  // @ts-ignore
  window.gtag('config', GA_TRACKING_ID, {
    page_path: path,
  });
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event = ({ action, category, label, value }: any) => {
  if (!existsGaId) {
    return;
  }
  window.gtag('event', action, {
    event_category: category,
    event_label: JSON.stringify(label),
  });
};
