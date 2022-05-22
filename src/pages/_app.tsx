import '../styles/globals.scss';
import type { AppProps } from 'next/app';
import usePageView from '../lib/gtag/usePageView';
import GoogleAnalytics from '../lib/gtag/GoogleAnalytics';

function MyApp({ Component, pageProps }: AppProps) {
  usePageView();

  return (
    <>
      <GoogleAnalytics />
      <Component {...pageProps} />;
    </>
  );
}

export default MyApp;
