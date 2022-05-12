import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';

const Blog: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;

  return (
    <Layout>
      <h1>Article</h1>
      <span>id: {id}</span>
    </Layout>
  );
};

export default Blog;
