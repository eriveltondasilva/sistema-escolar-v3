// scripts/posthtml-plugin.ts

import { file as bunFile } from "bun";
import { join } from "node:path";
import { cwd } from "node:process";

import posthtml from "posthtml";
import components from "posthtml-component";

import type { BunPlugin } from "bun";
import type { Options as PosthtmlOptions } from "posthtml";
import type { PostHTMLComponents } from "posthtml-component";

const componentsOptions: PostHTMLComponents = {
  root: join(cwd(), "client"),
  folders: ["components"],
  strict: true,
  safelistAttributes: [
    "x-*", // x-model, x-show, x-text, x-if, x-for, x-data, x-bind, x-on, x-ref, x-cloak...
    "@*", // @click, @change, @input, @submit...
    ":*", // :disabled, :class, :value...
    "onclick",
  ],
};

const posthtmlOptions: PosthtmlOptions = {
  // @ts-expect-error: false positive
  directives: [{ name: /\?[=!]?/, start: "<", end: ">" }],
};

// @ts-expect-error: false positive
const componentsPlugin = components(componentsOptions);

// -------------------------------------

export function posthtmlPlugin(): BunPlugin {
  return {
    name: "posthtml-gas",
    setup(build) {
      build.onLoad({ filter: /\.html$/ }, async ({ path }) => {
        const html = await bunFile(path).text();
        const result = await posthtml([componentsPlugin]).process(
          html,
          posthtmlOptions,
        );

        return { loader: "html", contents: result.html };
      });
    },
  };
}
