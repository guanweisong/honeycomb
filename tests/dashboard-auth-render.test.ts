import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import type * as Esbuild from "esbuild";
import { expect, it } from "vitest";

it("shares one admin lookup between layout and template only within a server render", async () => {
  const fixture = mkdtempSync(join(tmpdir(), "honeycomb-auth-render-"));
  try {
    const { build }: typeof Esbuild = createRequire(import.meta.url)("esbuild");
    symlinkSync(resolve("node_modules"), join(fixture, "node_modules"), "dir");
    const outfile = join(fixture, "render.cjs");
    await build({
      stdin: {
        contents: `
          import React from "react";
          import { renderToReadableStream } from "next/dist/compiled/react-server-dom-webpack/server.node";
          import Layout from "./src/app/admin/(root)/(dashboard)/layout";
          import Template from "./src/app/admin/(root)/(dashboard)/template";
          import { state } from "auth-fixture";
          async function render(withTemplate = true) {
            const errors = [];
            const stream = renderToReadableStream(
              React.createElement(Layout, null, withTemplate ? React.createElement(Template, null, "protected-content") : "protected-content"),
              {}, { onError: (error) => { errors.push(error.message); return error.message; } },
            );
            return { output: await new Response(stream).text(), errors, calls: state.calls };
          }
          (async () => {
            const first = await render();
            state.user = { ...state.user, id: "second-user" };
            const second = await render();
            state.user = null;
            const anonymous = await render();
            const layoutOnly = await render(false);
            console.log(JSON.stringify({ first, second, anonymous, layoutOnly }));
          })();
        `,
        resolveDir: process.cwd(),
        loader: "tsx",
      },
      outfile,
      bundle: true,
      platform: "node",
      format: "cjs",
      packages: "external",
      jsx: "automatic",
      plugins: [
        {
          name: "auth-external-boundaries",
          setup(builder) {
            builder.onResolve(
              {
                filter:
                  /^(auth-fixture|server-only|next\/headers|next\/navigation|@\/features\/user\/admin-user|@\/features\/user\/infrastructure\/user-repository|@\/packages\/infrastructure\/db\/db|@\/app\/admin\/AdminProviders|\.\/components\/DashboardClientShell)$/,
              },
              (args) => ({ path: args.path, namespace: "fixture" }),
            );
            builder.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => {
              const modules: Record<string, string> = {
                "auth-fixture":
                  'export const state = { calls: 0, user: { id: "first-user", name: "Admin", email: null, level: "ADMIN", status: "ENABLE" } };',
                "server-only": "",
                "next/headers":
                  'export async function headers() { return new Headers({ "x-honeycomb-admin-pathname": "/admin/tag" }); }',
                "next/navigation":
                  'export function redirect(path) { throw new Error("redirect:" + path); }',
                "@/features/user/admin-user":
                  'import { state } from "auth-fixture"; export async function getAdminUser() { state.calls++; return state.user; }',
                "@/features/user/infrastructure/user-repository":
                  "export function createUserRepository() { return {}; }",
                "@/packages/infrastructure/db/db":
                  "export function getDb() { return {}; }",
                "@/app/admin/AdminProviders":
                  "export function AdminProviders({ children }) { return children; }",
                "./components/DashboardClientShell":
                  "export function DashboardClientShell({ user, children }) { return [user.id, children]; }",
              };
              return { contents: modules[args.path], loader: "js" };
            });
          },
        },
      ],
    });
    const result = spawnSync("node", ["--conditions=react-server", outfile], {
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "production" },
      timeout: 20_000,
    });
    expect(result.status, result.stderr).toBe(0);
    const renders = JSON.parse(result.stdout);
    expect(renders.first.errors).toEqual([]);
    expect(renders.first.output).toContain("protected-content");
    expect(renders.first.calls).toBe(1);
    expect(renders.second.output).toContain("second-user");
    expect(renders.second.calls).toBe(2);
    expect(renders.anonymous.errors).toContain("redirect:/admin/login");
    expect(renders.anonymous.calls).toBe(3);
    expect(renders.layoutOnly.errors).toContain("redirect:/admin/login");
    expect(renders.layoutOnly.output).not.toContain('"protected-content"');
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}, 30_000);
// @vitest-environment node
