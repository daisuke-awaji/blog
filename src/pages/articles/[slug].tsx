import { InferGetStaticPropsType, NextPage } from 'next';
import Layout from '../../components/layout/Layout';
import { getAllPosts, getPostBySlug, markdownToHtml } from '../../lib/md';
import styles from './[slug].module.scss';

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
  const post = getPostBySlug(params.slug, ['slug', 'title', 'date', 'content']);
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
