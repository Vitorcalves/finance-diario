import type { Migration } from './types';
import { migration001 } from './001_initial';

export const migrations: Migration[] = [migration001];
