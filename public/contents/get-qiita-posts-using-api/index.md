---
title: Qiita API を活用して、投稿記事の一覧をブログに表示する
tags:
  - "Qiita"
img: /contents/get-qiita-posts-using-api/qiita-logo
date: 2023/02/01
---

# 結論

以下、TypeScript によるコードサンプルです。
※ 記事数が多くないので、ページングのロジックは考慮していません。

```ts
export const getAllPosts = async () => {
  const userName = 'G-awa'
  const url = 'https://qiita.com/api/v2/items?page=1&per_page=100&query=user:' + userName;
  const res = await fetch(url);
  const data = await res.json();

  return data.map((post) => ({
    title: post.title,
    url: post.url,
    tags: post.tags.map((tag) => tag.name),
    label: 'qiita',
    date: post.created_at,
  }));
```

Qiita API Documents: https://qiita.com/api/v2/docs

# 実行回数制限への考慮

Qiita API には API の実行回数上限が設定されています。

- アクセストークンで認証しない場合、1 時間で 60 回まで
- アクセストークンで認証した場合、1 時間で 1000 回まで

本ブログでは以下のような一覧に表示するために利用しており、Next.js の SSG(Static Site Generation) を行っているため、アクセストークンによる認証は含めていませんが、必要であればアクセストークンを発行しましょう。

![articles-page](/contents/get-qiita-posts-using-api/articles-page.png)
