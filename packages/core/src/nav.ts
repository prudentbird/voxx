import type { NavNode, Post } from "./types";
import { humanize } from "./util";

export function buildNavTree(posts: Post[]): NavNode[] {
  const root: NavNode = { title: "", children: [] };
  const nodes = new Map<string, NavNode>();

  const nodeFor = (path: string[]): NavNode => {
    if (path.length === 0) return root;
    const key = path.join("/");
    let node = nodes.get(key);
    if (!node) {
      node = { title: humanize(path[path.length - 1]!), children: [] };
      nodes.set(key, node);
      nodeFor(path.slice(0, -1)).children.push(node);
    }
    return node;
  };

  for (const post of posts) {
    if (post.path.length === 0) {
      root.children.push({ title: post.title, url: post.url, children: [] });
      continue;
    }
    const node = nodeFor(post.path);
    node.title = post.title;
    node.url = post.url;
  }

  return root.children;
}
