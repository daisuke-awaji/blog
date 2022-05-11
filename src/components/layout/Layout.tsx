import Link from 'next/link';
import styles from './Layout.module.scss';

const WEB_SITE_NAME = "G's";

const GITHUB_URL = 'https://github.com/daisuke-awaji';

const Layout: React.FC<{ children: any }> = ({ children }) => {
  return (
    <div>
      <div className={styles.container}>
        <header>
          <h1>{WEB_SITE_NAME}</h1>
        </header>

        <main className={styles.main}>{children}</main>
      </div>
      <footer className={styles.footer}>
        <Link href={GITHUB_URL}>
          <a>daisuke-awaji</a>
        </Link>
      </footer>
    </div>
  );
};

export default Layout;
