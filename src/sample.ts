import type { WiringModel } from './types';

/** 内置示例：8 个按圆周顺序排列的端点 */
export const SAMPLE_MODEL: WiringModel = {
  endpoints: [
    { id: 'E1' },
    { id: 'E2' },
    { id: 'E3' },
    { id: 'E4' },
    { id: 'E5' },
    { id: 'E6' },
    { id: 'E7' },
    { id: 'E8' },
  ],
  candidates: [
    { a: 'E1', b: 'E2', cost: 2 },
    { a: 'E2', b: 'E3', cost: 1 },
    { a: 'E3', b: 'E4', cost: 2 },
    { a: 'E4', b: 'E5', cost: 1 },
    { a: 'E5', b: 'E6', cost: 2 },
    { a: 'E6', b: 'E7', cost: 1 },
    { a: 'E7', b: 'E8', cost: 2 },
    { a: 'E8', b: 'E1', cost: 3 },
    { a: 'E1', b: 'E4', cost: 5 },
    { a: 'E2', b: 'E5', cost: 6 },
    { a: 'E3', b: 'E6', cost: 4 },
    { a: 'E4', b: 'E7', cost: 7 },
    { a: 'E5', b: 'E8', cost: 5 },
    { a: 'E6', b: 'E1', cost: 8 },
    { a: 'E7', b: 'E2', cost: 6 },
    { a: 'E8', b: 'E3', cost: 9 },
    { a: 'E1', b: 'E6', cost: 4 },
    { a: 'E2', b: 'E7', cost: 3 },
  ],
};
