import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import { NextAdapter } from './next-adapter';

describe('NextAdapter', () => {
  describe('isEntry', () => {
    it('identifies standard App Router pages', () => {
      expect(NextAdapter.isEntry('app/page.tsx')).toBe(true);
      expect(NextAdapter.isEntry('app/dashboard/page.tsx')).toBe(true);
      expect(NextAdapter.isEntry('src/app/page.tsx')).toBe(true);
      expect(NextAdapter.isEntry('src/app/admin/settings/page.tsx')).toBe(true);
    });

    it('identifies standard App Router layouts and other special files', () => {
      expect(NextAdapter.isEntry('app/layout.tsx')).toBe(true);
      expect(NextAdapter.isEntry('app/loading.tsx')).toBe(true);
      expect(NextAdapter.isEntry('src/app/error.tsx')).toBe(true);
      expect(NextAdapter.isEntry('src/app/api/hello/route.ts')).toBe(true);
    });

    it('identifies root entries', () => {
      expect(NextAdapter.isEntry('middleware.ts')).toBe(true);
      expect(NextAdapter.isEntry('src/middleware.js')).toBe(true);
      expect(NextAdapter.isEntry('instrumentation.ts')).toBe(true);
    });

    it('identifies config files', () => {
      expect(NextAdapter.isEntry('next.config.ts')).toBe(true);
      expect(NextAdapter.isEntry('tailwind.config.js')).toBe(true);
      expect(NextAdapter.isEntry('tsconfig.json')).toBe(true);
      expect(NextAdapter.isEntry('package.json')).toBe(true);
      expect(NextAdapter.isEntry('.env.local')).toBe(true);
    });

    it('identifies package-prefixed entries', () => {
      expect(NextAdapter.isEntry('packages/web/app/page.tsx')).toBe(true);
      expect(NextAdapter.isEntry('apps/main/src/app/layout.tsx')).toBe(true);
    });

    it('does not identify regular components as entries', () => {
      expect(NextAdapter.isEntry('components/Button.tsx')).toBe(false);
      expect(NextAdapter.isEntry('lib/utils.ts')).toBe(false);
      expect(NextAdapter.isEntry('app/_components/Header.tsx')).toBe(false);
    });
  });

  describe('shouldInclude', () => {
    it('excludes node_modules and build artifacts', () => {
      expect(NextAdapter.shouldInclude('node_modules/react/index.js')).toBe(false);
      expect(NextAdapter.shouldInclude('.next/static/chunks/main.js')).toBe(false);
      expect(NextAdapter.shouldInclude('dist/bundle.js')).toBe(false);
    });

    it('includes source files', () => {
      expect(NextAdapter.shouldInclude('app/page.tsx')).toBe(true);
      expect(NextAdapter.shouldInclude('lib/parser/graph.ts')).toBe(true);
      expect(NextAdapter.shouldInclude('lib/distribution.ts')).toBe(true);
      expect(NextAdapter.shouldInclude('components/distance.tsx')).toBe(true);
    });
  });

  describe('getRoutes', () => {
    const project = new Project();

    function getRoutePath(filePath: string) {
      const sourceFile = project.createSourceFile(filePath, '', { overwrite: true });
      const routes = NextAdapter.getRoutes?.(sourceFile, filePath) || [];
      return routes.length > 0 ? routes[0].path : null;
    }

    it('recovers simple routes', () => {
      expect(getRoutePath('app/page.tsx')).toBe('/');
      expect(getRoutePath('app/dashboard/page.tsx')).toBe('/dashboard');
    });

    it('recovers dynamic segments', () => {
      expect(getRoutePath('app/blog/[id]/page.tsx')).toBe('/blog/[id]');
    });

    it('recovers catch-all routes', () => {
      expect(getRoutePath('app/blog/[...slug]/page.tsx')).toBe('/blog/[...slug]');
    });

    it('omits parallel slots', () => {
      expect(getRoutePath('app/@sidebar/page.tsx')).toBe(null);
    });

    it('handles route groups correctly', () => {
      expect(getRoutePath('app/(auth)/login/page.tsx')).toBe('/login');
    });

    it('handles optional catch-all routes', () => {
      expect(getRoutePath('app/docs/[[...slug]]/page.tsx')).toBe('/docs/[[...slug]]');
    });

    it('omits private folders', () => {
      expect(getRoutePath('app/_utils/page.tsx')).toBe(null);
    });

    it('omits intercepting routes', () => {
      expect(getRoutePath('app/feed/(.)[id]/page.tsx')).toBe(null);
    });
  });
});
