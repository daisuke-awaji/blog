import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { unified } from 'unified';
import { remark } from 'remark';
import html from 'remark-html';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeHighlight from 'rehype-highlight';
import rehypeStringify from 'rehype-stringify';
import remarkToc from 'remark-toc';
import remarkSlug from 'remark-slug';

type Post = {
  slug: string;
  content: string;
  title: string;
  date: string;
  tags: string[];
  img: string;
};

const dir = path.join(process.cwd(), 'public/contents');

/**
 * postsDirectory 以下のディレクトリ名を取得する
 */
export function getPostSlugs() {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map(({ name }) => name);
}

/**
 * ファイルの最終更新日時
 * @param path
 * @returns
 */
const getFileUpdateDate = (path: string) => {
  const stats = fs.statSync(path);
  return stats.mtime.toISOString().substring(0, 10);
};

/**
 * 指定したフィールド名から、記事のフィールドの値を取得する
 */
export function getPostBySlug(slug: string, fields: Array<keyof Post> = []) {
  const fullPath = path.join(dir, slug, 'index.md');

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  const items: Post = {
    slug: '',
    content: '',
    title: '',
    date: getFileUpdateDate(fullPath),
    tags: [],
    img: '',
  };

  fields.forEach((field) => {
    if (field === 'slug') {
      items[field] = slug;
    }
    if (field === 'content') {
      items[field] = content;
    }
    if (field === 'title' || field === 'tags' || field === 'img') {
      items[field] = data[field];
    }
  });
  return items;
}

/**
 * すべての記事について、指定したフィールドの値を取得して返す
 * @param fields 取得するフィールド
 */
export function getAllPosts<T extends keyof Post>(fields: Array<T> = []): Pick<Post, T>[] {
  const slugs = getPostSlugs();
  const posts = slugs.map((slug) => getPostBySlug(slug, fields)).sort((a, b) => (a.date > b.date ? -1 : 1));
  return posts;
}

/**
 * Markdown を解析して HTML にして返す
 * @param markdown Markdown ファイル名
 * @returns HTML
 */
export const markdownToHtml = async (markdown: string) => {
  const result = await unified()
    .use(html)
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkSlug)
    .use(remarkToc, { heading: '目次', tight: true, prefix: '', maxDepth: 2 })
    .use(remarkRehype)
    .use(rehypeHighlight)
    .use(rehypeStringify)
    .process(markdown);
  return result.value.toString();
};
