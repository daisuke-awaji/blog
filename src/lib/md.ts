import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

type Post = {
  slug: string;
  content: string;
  title: string;
  date: string;
  tags: string[];
};

const postsDirectory = path.join(process.cwd(), 'src/content');

/**
 * postsDirectory 以下のディレクトリ名を取得する
 */
export function getPostSlugs() {
  const allDirents = fs.readdirSync(postsDirectory, { withFileTypes: true });
  return allDirents.filter((dirent) => dirent.isDirectory()).map(({ name }) => name);
}

/**
 * 指定したフィールド名から、記事のフィールドの値を取得する
 */
export function getPostBySlug(slug: string, fields: string[] = []) {
  const fullPath = path.join(postsDirectory, slug, 'index.md');
  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  const items: Post = {
    slug: '',
    content: '',
    title: '',
    date: '',
    tags: [],
  };

  fields.forEach((field) => {
    if (field === 'slug') {
      items[field] = slug;
    }
    if (field === 'content') {
      items[field] = content;
    }
    if (field === 'title' || field === 'date' || field === 'tags') {
      items[field] = data[field];
    }
  });
  return items;
}

/**
 * すべての記事について、指定したフィールドの値を取得して返す
 * @param fields 取得するフィールド
 */
export function getAllPosts(fields: string[] = []) {
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
  const result = await remark().use(html).process(markdown);
  return result.toString();
};
