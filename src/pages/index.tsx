import type { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../components/layout/Layout';
import styles from './Home.module.scss';
import React from 'react';
import { LinkCard } from '../components/Card/LinkCard';

const StyledLinkCard = (props: any) => <LinkCard className={styles.centeredCard} {...props} />;

const links = [
  {
    href: '/articles',
    title: 'Articles 📕',
  },
  {
    href: '/profile',
    title: 'Profile 🧑‍💻',
  },
  {
    href: '/products',
    title: 'Products 🔨',
  },
];

const Home: NextPage = () => {
  return (
    <Layout>
      <Head>
        <title>G&apos;s | Home</title>
        <meta name="description" content="home" />
      </Head>

      <h1>Hi there 👋</h1>

      <div className={styles.grid}>
        {links.map((link) => (
          <StyledLinkCard key={link.title} href={link.href}>
            {link.title}
          </StyledLinkCard>
        ))}
      </div>
    </Layout>
  );
};

export default Home;
