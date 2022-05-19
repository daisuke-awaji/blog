import { useEffect } from 'react';

const useFavicon = (href: any) => {
  useEffect(() => {
    const link: any = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = href;
    document.getElementsByTagName('head')[0].appendChild(link);
  }, [href]);
};

export const useEmojiFavicon = (emoji: string) => {
  const href =
    'data:image/svg+xml,' +
    '<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22>' +
    '<text x=%2250%%22 y=%2250%%22 style=%22dominant-baseline:central;text-anchor:middle;font-size:90px;%22>' +
    emoji +
    '</text></svg>';

  useFavicon(href);
};
