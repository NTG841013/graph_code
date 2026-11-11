import { ParserAdapter } from '../parser/types';
import { NextAdapter } from './next-adapter';
import { NestAdapter } from './nest-adapter';
import { ExpressAdapter } from './express-adapter';
import { ReactAdapter } from './react-adapter';

export const ADAPTERS: ParserAdapter[] = [
  NextAdapter,
  NestAdapter,
  ExpressAdapter,
  ReactAdapter,
];

export const FallbackAdapter: ParserAdapter = {
  name: 'Generic',
  detect: () => true,
  isEntry: () => false,
  shouldInclude: (path: string) => {
    const excluded = /(?:^|\/)(?:node_modules|\.git|dist)(?:\/|$)/;
    return !excluded.test(path);
  },
  resolveImport: () => null,
  getRole: () => null,
};

export function detectAdapter(filePaths: string[]): ParserAdapter {
  for (const adapter of ADAPTERS) {
    if (adapter.detect(filePaths)) {
      return adapter;
    }
  }
  return FallbackAdapter;
}
