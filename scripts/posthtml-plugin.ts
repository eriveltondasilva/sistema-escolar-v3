// scripts\posthtml-plugin.ts
import type { BunPlugin } from "bun";
import type { PostHTMLComponents } from "posthtml-component";

import { file as bunFile, write as bunWrite } from "bun";

import { join } from "node:path";
import { cwd } from "node:process";

import posthtml from "posthtml";
import components from "posthtml-component";

const optionsComponents: PostHTMLComponents = {
  root: join(cwd(), "client"),
  folders: ["components"],
  strict: true,
};

function maskGasScriptlets(html: string, map: Map<string, string>): string {
  let counter = 0;

  return html.replace(/<\?[\s\S]*?\?>/g, (match) => {
    const placeholder = `__GAS_SCRIPTLET_${counter++}__`;
    map.set(placeholder, match);
    return placeholder;
  });
}

function restoreGasScriptlets(html: string, map: Map<string, string>): string {
  let content = html;

  for (const [placeholder, original] of map.entries()) {
    content = content.replaceAll(placeholder, original);
  }

  return content;
}

// -------------------------------------

export function posthtmlPlugin(): BunPlugin {
  const scriptletsByFile = new Map<string, Map<string, string>>();

  return {
    name: "posthtml-gas",
    setup(build) {
      build.onLoad({ filter: /\.html$/ }, async ({ path }) => {
        let html = await bunFile(path).text();

        const fileMap = new Map<string, string>();
        scriptletsByFile.set(path, fileMap);

        html = maskGasScriptlets(html, fileMap);

        const result = await posthtml([
          // @ts-expect-error
          components(optionsComponents),
        ]).process(html);

        return { loader: "html", contents: result.html };
      });

      build.onEnd(async (result) => {
        if (!result.success) return;

        for (const artifact of result.outputs) {
          if (!artifact.path?.endsWith(".html")) continue;

          const fileName = artifact.path.split("/").pop();
          const sourceEntry = [...scriptletsByFile.entries()].find(
            ([sourcePath]) => sourcePath.endsWith(`/${fileName}`),
          );

          if (!sourceEntry) continue;

          const [, fileMap] = sourceEntry;
          let content = await bunFile(artifact.path).text();
          content = restoreGasScriptlets(content, fileMap);
          await bunWrite(artifact.path, content);
        }
      });
    },
  };
}
