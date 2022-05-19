import type { InferGetStaticPropsType, NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import styles from './articles.module.scss';
import React from 'react';
import { LinkCard } from '../../components/Card/LinkCard';
import { getAllPosts } from '../../lib/md';
import { getAllPosts as getAllPostsQiita } from '../../lib/qiita';

const Tag: React.FC<{ tag: string }> = ({ tag }) => {
  return <div className={styles.tag}>{tag}</div>;
};

type Props = InferGetStaticPropsType<typeof getStaticProps>;
export const getStaticProps = async () => {
  const allPosts = getAllPosts(['slug', 'title', 'date', 'tags']).map((post) => ({
    ...post,
    url: `/articles/${post.slug}`,
  }));

  const qiitaPosts = await getAllPostsQiita();

  return {
    props: {
      allPosts: [...allPosts, ...qiitaPosts],
    },
  };
};

type ArticleCardProps = {
  title: string;
  url: string;
  tags: string[];
  label?: string;
  date: string;
};

const ArticleCard: React.FC<ArticleCardProps> = (post) => {
  const label = post.label ? <span className={styles.cardLabel + ' ' + styles.qiita}>{post.label}</span> : undefined;

  return (
    <LinkCard href={post.url} label={label} key={post.url}>
      <div>{post.title}</div>
      <div className={styles.tagContainer}>
        {post.tags.map((tag, i) => (
          <Tag key={i} tag={tag} />
        ))}
      </div>
      <div className={styles.date}>{post.date}</div>
    </LinkCard>
  );
};

const Blog: NextPage<Props> = ({ allPosts }) => {
  return (
    <Layout>
      <Head>
        <title>G&apos;s | Articles</title>
        <meta name="description" content="Articles" />
      </Head>

      <h1>Articles</h1>

      <div className={styles.grid}>
        {allPosts.map((post) => (
          <ArticleCard {...post} key={post.title} />
        ))}
      </div>
    </Layout>
  );
};

export default Blog;
