// type User = {
//         description: '物性物理学、分子動力学の研究をやってました。サイエンス出身、スパコンが好きです。\r\n' +
//           '分散コンピューティング・機械学習・フロントエンドのUI/UX などの領域で活動してます。',
//         facebook_id: '',
//         followees_count: 60,
//         followers_count: 205,
//         github_login_name: 'daisuke-awaji',
//         id: 'G-awa',
//         items_count: 51,
//         linkedin_id: '',
//         location: '',
//         name: '',
//         organization: '',
//         permanent_id: 163591,
//         profile_image_url: 'https://qiita-image-store.s3.amazonaws.com/0/163591/profile-images/1501201644',
//         team_only: false,
//         twitter_screen_name: 'gee0awa',
//         website_url: ''
//       }

type User = any;

type Tag = {
  name: string;
  versions: any[];
};

type Res = {
  rendered_body: string;
  coediting: boolean;
  comments_count: number;
  created_at: string;
  group: null;
  id: 'dba92983ba03ee8daec6';
  likes_count: 133;
  private: boolean;
  reactions_count: 0;
  tags: Tag[];
  title: 'GraphQL Mesh は何を解決するのか？ ~ Qiita API を GraphQL でラップして理解する GraphQL Mesh ~';
  updated_at: string;
  url: 'https://qiita.com/G-awa/items/dba92983ba03ee8daec6';
  user: User;
  page_views_count: null;
  team_membership: null;
};

export const getAllPosts = async () => {
  const url = 'https://qiita.com/api/v2/items?page=1&per_page=100&query=user:G-awa';
  const res = await fetch(url);
  const data = await res.json();

  return data.map((post: Res) => ({
    title: post.title,
    url: post.url,
    tags: post.tags.map((tag) => tag.name),
    label: 'qiita',
    date: post.created_at,
  }));

  // return [
  //   {
  //     title: 'Webサイトを設定ゼロで爆速デプロイする Serverless Component を公開しました⚡️',
  //     url: 'https://qiita.com/G-awa/items/d972cd4383676815c78d',
  //     tags: ['Serverless', 'React', 'CloudFront'],
  //     label: 'qiita',
  //     date: '2020-07-01',
  //   },
  //   {
  //     title: 'Chaos Engineering on Frontend ~フロントエンドにカオス性を注入して信頼性を向上させよう~',
  //     url: 'https://qiita.com/G-awa/items/9dc13c2db99cc85705bf',
  //     tags: ['Chaos', 'Frontend'],
  //     label: 'qiita',
  //     date: '2020-07-01',
  //   },
  //   {
  //     title: 'Effective AppSync 〜 Serverless Framework を使用した AppSync の実践的な開発方法とテスト戦略 〜',
  //     url: 'https://qiita.com/G-awa/items/095faa9a94da09bc3ed5',
  //     tags: ['AppSync', 'Serverless'],
  //     label: 'qiita',
  //     date: '2020-07-01',
  //   },
  //   {
  //     title: 'AWS Amplify での Cognito アクセスは React Context.Provider を使って認証処理を Hooks 化しよう',
  //     url: 'https://qiita.com/G-awa/items/99cb84c62fcd113943a6',
  //     tags: ['Cognito', 'Amplify'],
  //     label: 'qiita',
  //     date: '2020-07-01',
  //   },
  // ];
};
