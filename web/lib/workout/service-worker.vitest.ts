import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';

const worker=readFileSync(resolve(process.cwd(),'public','sw.js'),'utf8');
describe('service worker privacy boundary',()=>{it('never handles API or auth requests',()=>{expect(worker).toContain("url.includes('/api/')");expect(worker).toContain("url.includes('/auth/')")});it('only caches same-origin static assets',()=>{expect(worker).toContain("url.origin!==self.location.origin");expect(worker).toContain("url.pathname.startsWith('/_next/static/')");expect(worker).not.toContain('cache.put(event.request,response)')});it('includes installable bitmap icons',()=>{expect(worker).toContain('/icon-192.png');expect(worker).toContain('/icon-512.png')})});
