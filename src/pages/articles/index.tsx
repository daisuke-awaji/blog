import type { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import styles from './index.module.scss';
import React from 'react';
import { LinkCard } from '../../components/Card/LinkCard';

const articles = [
  {
    title: 'Webサイトを設定ゼロで爆速デプロイする Serverless Component を公開しました⚡️',
    url: 'https://qiita.com/G-awa/items/d972cd4383676815c78d',
    tags: ['Serverless', 'React', 'CloudFront'],
  },
  {
    title: 'Chaos Engineering on Frontend ~フロントエンドにカオス性を注入して信頼性を向上させよう~',
    url: 'https://qiita.com/G-awa/items/9dc13c2db99cc85705bf',
    tags: ['Chaos', 'Frontend'],
  },
  {
    title: 'Effective AppSync 〜 Serverless Framework を使用した AppSync の実践的な開発方法とテスト戦略 〜',
    url: 'https://qiita.com/G-awa/items/095faa9a94da09bc3ed5',
    tags: ['AppSync', 'Serverless'],
  },
  {
    title: 'AWS Amplify での Cognito アクセスは React Context.Provider を使って認証処理を Hooks 化しよう',
    url: 'https://qiita.com/G-awa/items/99cb84c62fcd113943a6',
    tags: ['Cognito', 'Amplify'],
  },
];

const Tag: React.FC<{ tag: string }> = ({ tag }) => {
  return <span className={styles.tag}>{tag}</span>;
};

const Blog: NextPage = () => {
  return (
    <Layout>
      <Head>
        <title>G&apos;s | Blog</title>
        <meta name="description" content="Blog" />
      </Head>

      <h1>Articles</h1>

      <div className={styles.grid}>
        {articles.map((article) => (
          <LinkCard key={article.title} href={article.url}>
            <div>{article.title}</div>
            <div className={styles.tagContainer}>
              {article.tags.map((tag, i) => (
                <Tag key={i} tag={tag} />
              ))}
            </div>
          </LinkCard>
        ))}
      </div>
    </Layout>
  );
};

export default Blog;
