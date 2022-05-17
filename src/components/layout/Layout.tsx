import Link from 'next/link';
import styles from './Layout.module.scss';

const WEB_SITE_NAME = "G's";

const GITHUB_URL = 'https://github.com/daisuke-awaji';

const Layout: React.FC<{ children: any }> = ({ children }) => {
  return (
    <div className={styles.root}>
      <meta name="theme-color" content="white" />
      <header className={styles.header}>
        <div className={styles.headerContainer}>
          <Link href="/">
            <a>
              <h1>{WEB_SITE_NAME}</h1>
            </a>
          </Link>
          <h2>⚡️</h2>
        </div>
      </header>

      <main className={styles.main}>{children}</main>

      <footer className={styles.footer}>
        <Link href={GITHUB_URL}>
          <a>@daisuke-awaji</a>
        </Link>
      </footer>
    </div>
  );
};

export default Layout;
