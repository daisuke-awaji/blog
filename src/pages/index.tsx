import type { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../components/layout/Layout';
import styles from './Home.module.scss';
import React from 'react';
import { LinkCard } from '../components/Card/LinkCard';
import Seo from '../components/Seo';

const StyledLinkCard = (props: any) => <LinkCard className={styles.centeredCard} {...props} />;

const links = [
  {
    href: '/articles',
    title: 'Articles 📕',
  },
  {
    href: 'https://github.com/daisuke-awaji',
    title: 'Profile 🧑‍💻',
  },
  {
    href: 'https://github.com/daisuke-awaji',
    title: 'Products 🔨',
  },
];

const Home: NextPage = () => {
  return (
    <Layout>
      <Seo
        pageTitle={"G's | Home"}
        pageDescription={"G's | Home"}
        pageImg={'https://geeawa.vercel.app/ogp.jpeg'}
        pageImgWidth={1280}
        pageImgHeight={960}
      />

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
