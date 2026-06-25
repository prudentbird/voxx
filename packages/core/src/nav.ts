import type { NavNode, PostMeta } from "./types";
import { humanize } from "./util";

/**
 * Builds a sidebar navigation tree from an ordered list of docs posts.
 *
 * Directory segments become category nodes; index files promote their
 * title and URL onto the parent node.
 *
 * @param posts - Post metadata sorted in docs order (order-prefix aware).
 * @returns Top-level `NavNode` array suitable for a sidebar component.
 */
export function buildNavTree(posts: PostMeta[]): NavNode[] {
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
