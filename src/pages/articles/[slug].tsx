import { InferGetStaticPropsType, NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import { getAllPosts, getPostBySlug, markdownToHtml } from '../../lib/md';
import styles from './[slug].module.scss';
import 'highlight.js/styles/atom-one-dark-reasonable.css';
import Seo from '../../components/Seo';

type Props = InferGetStaticPropsType<typeof getStaticProps>;

/**
 * 記事のパスを取得する
 */
export const getStaticPaths = async () => {
  const posts = getAllPosts(['slug']);
  return {
    paths: posts.map((post) => {
      return {
        params: {
          slug: post.slug,
        },
      };
    }),
    fallback: false,
  };
};

/**
 * 記事の内容を取得する
 */
export const getStaticProps = async ({ params }: any) => {
  const post = getPostBySlug(params.slug, ['slug', 'title', 'date', 'content', 'img']);
  // Markdown を HTML に変換する
  const content = await markdownToHtml(post.content);
  // content を詰め直して返す
  return {
    props: {
      post: {
        ...post,
        content,
      },
    },
  };
};

const Blog: NextPage<Props> = ({ post }) => {
  return (
    <Layout>
      <Seo
        pageTitle={post.title}
        pageDescription={"G's | " + post.title}
        pageImg={'https://geeawa.vercel.app' + post?.img ?? '/opg.jpeg'}
        pageImgWidth={1280}
        pageImgHeight={960}
      />

      <div className={styles.titleContainer}>
        <h1>{post.title}</h1>
        <p>{post.date}</p>
      </div>

      <div className={styles.content}>
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </div>
    </Layout>
  );
};

export default Blog;
