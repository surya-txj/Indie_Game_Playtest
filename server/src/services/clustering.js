import { similarityScore } from '../utils/cosine.js';

export class UnionFind {
  constructor(n) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.rank = new Array(n).fill(0);
  }
  find(x) {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    if (this.rank[ra] < this.rank[rb]) this.parent[ra] = rb;
    else if (this.rank[ra] > this.rank[rb]) this.parent[rb] = ra;
    else {
      this.parent[rb] = ra;
      this.rank[ra] += 1;
    }
  }
}

/**
 * Groups items whose vectors score ≥ threshold (Atlas cosine scale) with any
 * other member. Returns clusters of 2+ items, largest first, each with the
 * average pairwise score of its linked edges.
 */
export function clusterByThreshold(items, threshold) {
  const n = items.length;
  const uf = new UnionFind(n);
  const edgeScores = [];
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const score = similarityScore(items[i].embedding, items[j].embedding);
      if (score >= threshold) {
        uf.union(i, j);
        edgeScores.push({ i, j, score });
      }
    }
  }

  const groups = new Map();
  for (let i = 0; i < n; i += 1) {
    const root = uf.find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  }

  const clusters = [];
  for (const [root, members] of groups) {
    if (members.length < 2) continue;
    const scores = edgeScores.filter((e) => uf.find(e.i) === root).map((e) => e.score);
    clusters.push({
      items: members.map((i) => items[i]),
      meanScore: scores.reduce((a, b) => a + b, 0) / scores.length,
    });
  }
  return clusters.sort((a, b) => b.items.length - a.items.length);
}
