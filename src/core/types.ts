/**
 * 领域模型：环形接驳板上的端点与候选连线。
 * 端点按圆周顺序给出，内部一律使用圆序下标（0..n-1）作为“编号”。
 */

/** 一条候选连线（无向），a、b 为端点圆序下标且 a < b，loss 为非负整数损耗。 */
export interface Candidate {
  a: number;
  b: number;
  loss: number;
  /** 在候选文本中的原始行号（1 起），用于定位反馈。 */
  line: number;
}

/** 通过校验的完整模型。 */
export interface Model {
  /** 按圆周顺序排列的端点 id，唯一、非空，数量为不小于 2 的偶数。 */
  endpoints: string[];
  candidates: Candidate[];
}

/** 带定位信息的模型错误。 */
export interface ModelIssue {
  code:
    | 'endpoints-too-few'
    | 'endpoints-odd'
    | 'endpoint-invalid'
    | 'endpoint-duplicate'
    | 'candidate-format'
    | 'candidate-loss'
    | 'candidate-self-loop'
    | 'candidate-unknown-endpoint'
    | 'candidate-duplicate';
  scope: 'endpoints' | 'candidates';
  /** 原始文本行号（1 起）；整体性问题（如奇数个端点）无行号。 */
  line?: number;
  message: string;
}

/** 解析+校验结果：要么得到可用模型，要么只有错误（二者可并存，model 仅在无错时给出）。 */
export interface ParseOutcome {
  model: Model | null;
  issues: ModelIssue[];
}

/** 求解结果。 */
export type SolveResult =
  | {
      status: 'optimal';
      /** 总损耗。 */
      totalLoss: number;
      /** 选中的弦，元素为圆序下标对 [i, j] 且 i < j。 */
      pairs: [number, number][];
      /** 配对另一端序列：partnerSeq[i] 为编号 i 的配对对象编号（0 起）。 */
      partnerSeq: number[];
      /** 完整比较过的可行非交叉完美配对总数。 */
      feasibleCount: bigint;
    }
  | { status: 'infeasible'; feasibleCount: 0n };
