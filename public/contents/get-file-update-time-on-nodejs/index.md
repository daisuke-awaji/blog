---
title: Node.js を使用してファイルの更新日を取得する
tags:
  - "Node.js"
img: ""
date: 2023/02/01
---

# Node.js を使用してファイルの最終更新日を取得する

Node.js においてファイル操作には、[fs モジュール](https://nodejs.org/api/fs.html#file-system) を使用します。

このモジュールの、[`fs.statSync()`](https://nodejs.org/api/fs.html#fsstatsyncpath-options) を使用することで、ファイルの詳細を同期的に取得できます。
ファイルパスを渡して呼び出すことにより、mtime プロパティを含むオブジェクトを返します。

以下は TypeScript における実装例です。

```ts
import fs from "fs";

const getFileUpdateDate = (path: string): Date => {
  const stats = fs.statSync(path);
  return stats.mtime;
};
```

非同期的に取り扱いたい場合は [`fsPromises.stat()`](https://nodejs.org/api/fs.html#fspromisesstatpath-options) を使用しましょう。

```ts
import fs from "fs/promises";

const getFileUpdateDate = async (path: string): Promise<Date> => {
  const stats = await fs.stat(path);
  return stats.mtime;
};
```
