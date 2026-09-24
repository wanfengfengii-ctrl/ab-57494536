/** 领域模型类型定义 */

/** 端点：编号唯一，按圆周顺序排列 */
export interface Endpoint {
  id: string;
  label?: string;
}

/** 允许连接的候选对（无向，a/b 顺序任意），损耗为非负整数 */
export interface Candidate {
  a: string;
  b: string;
  cost: number;
}

/** 完整可编辑的模型 */
export interface WiringModel {
  endpoints: Endpoint[];
  candidates: Candidate[];
}

/** 求解结果中的一条选中回流线 */
export interface ChosenChord {
  a: string;
  b: string;
  cost: number;
}

/** 两条候选弦在圆内相交的冲突关系 */
export interface ChordConflict {
  /** 候选对在候选列表中的下标（0 基） */
  i: number;
  j: number;
}

/** 求解结果 */
export interface SolveResult {
  /** 总损耗 */
  totalCost: number;
  /** 选中的弦（按端点编号升序，每弦内部小编号在前） */
  chords: ChosenChord[];
  /** 完整比较过程中枚举到的可行完美配对数量 */
  feasibleCount: number;
  /**
   * 次优判据：按端点编号升序，每个端点与其配对另一端的序列。
   * 数组按端点编号升序排列，partner 为该端点所连端点的编号。
   */
  partnerSequence: Array<{ id: string; partner: string }>;
}
