/**
 * 圆内弦相交的纯组合判定。
 *
 * 端点按圆周顺序编号（下标 0..n-1，循环排列）。
 * 端点互不相同的两条弦 (a,b)、(c,d) 在圆内严格相交，当且仅当
 * 其中一条弦的两个端点恰好有一个落在另一条弦沿某一方向的开弧上，
 * 即四点互异且在圆周上交错排列。
 */

export function circularIndex(id: string, order: string[]): number {
  return order.indexOf(id);
}

/**
 * @param x1 弦1端点下标
 * @param y1 弦1端点下标
 * @param x2 弦2端点下标
 * @param y2 弦2端点下标
 * @returns 两条端点互不相同的弦是否在圆内部严格相交（端点相接不算相交）
 */
export function chordsCrossByIndex(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): boolean {
  // 端点相同（共端点）则不可能在圆内交叉
  if (x1 === x2 || x1 === y2 || y1 === x2 || y1 === y2) return false;

  // 将弦1归一为 (x1, y1)，沿顺时针从 x1 到 y1 形成开弧。
  // 弦2 与弦1 相交 ⇔ 弦2 恰有一个端点位于该开弧内。
  const inOpenArc = (p: number): boolean => {
    if (x1 < y1) return p > x1 && p < y1;
    // 跨过 0 点的弧
    return p > x1 || p < y1;
  };

  return inOpenArc(x2) !== inOpenArc(y2);
}

export function chordsCross(
  a: string,
  b: string,
  c: string,
  d: string,
  order: string[],
): boolean {
  return chordsCrossByIndex(
    order.indexOf(a),
    order.indexOf(b),
    order.indexOf(c),
    order.indexOf(d),
  );
}

/** 给定圆周顺序，返回 SVG 中第 i 个端点的坐标（12 点方向起始，顺时针） */
export function pointOnCircle(
  index: number,
  count: number,
  radius: number,
  cx = 0,
  cy = 0,
): { x: number; y: number } {
  const angle = (2 * Math.PI * index) / count - Math.PI / 2;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}
