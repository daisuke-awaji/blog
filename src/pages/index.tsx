import type { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../components/layout/Layout';
import styles from './Home.module.scss';
import React from 'react';
import { Card } from '../components/Card/GlassCard';
import { LinkCard } from '../components/Card/LinkCard';

const Home: NextPage = () => {
  return (
    <Layout>
      <Head>
        <title>G&apos;s | Home</title>
        <meta name="description" content="home" />
      </Head>

      {/* <div className={styles.profileTop}>Profile Top</div> */}

      <div className={styles.grid}>
        <LinkCard href={'/articles'}>Articles</LinkCard>

        <Card>Profile</Card>
        <Card>Products</Card>
      </div>
    </Layout>
  );
};

export default Home;
