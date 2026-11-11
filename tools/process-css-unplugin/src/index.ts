import stringHash from 'string-hash';
import type { UnpluginInstance } from 'unplugin';
import { createUnplugin } from 'unplugin';

const ISOLUTION_SUFFIX = '_gg_';
const REGEXPS = {
  RESHADOW_STYLES: /\/\*!?__reshadow-styles__:"(.*?)"\*\//g,
  // New output format: `(sstyled.insert(...), /*__reshadow_css_end__*/`
  RESHADOW_CSS_NEW: /\/\*__reshadow_css_start__\*\/([\s\S]*?)\)\s*\/\*__reshadow_css_end__\*\//g,
  // Old output format: `sstyled.insert(...),\n/*__reshadow_css_end__*/`
  RESHADOW_CSS_OLD: /\/\*__reshadow_css_start__\*\/([\s\S]*?),( ?)(\n?)\/\*__reshadow_css_end__\*\//g,
  INNER_CSS: /__inner_css_start__\*\/([\s\S]*?),?(\n?)\s*\/\*__inner_css_end__/,
  ES6_IMPORT: /^import /m,
} as const;

// The hash depends only on the CSS content: several modules of one package may embed the same
// stylesheet (e.g. `data-table` Head/Column/Group), and they must resolve to a single virtual file,
// otherwise the same styles end up in the bundle several times.
const generateHashedFilePath = (code: string, prefix?: string): string => {
  const hash = `${stringHash(code)}`;
  return prefix ? `${prefix}_${hash}.css` : `${hash}.css`;
};

const extractCssFromCode = (code: string): string => {
  const match = code.match(REGEXPS.INNER_CSS) ?? [];

  let [, css] = match;

  if (!css) return '';

  css = css.trim().replace(/,$/, '');

  // Double-quoted strings are JSON-compatible: decode escape sequences (`\n`, `\"`, `\\`, ...)
  // so they don't get into the resulting CSS as is.
  if (css.length >= 2 && css.startsWith('"') && css.endsWith('"')) {
    try {
      return JSON.parse(css);
    } catch {
      // fall back to stripping the quotes
    }
  }

  return css.replace(/^[`'"]([\s\S]*?)[`'"]$/, '$1');
};

const createImportStatement = (path: string, isES6: boolean): string => {
  return isES6 ? `import '${path}';` : `require('${path}');`;
};

const replaceIsolationSuffix = (content: string, newSuffix: string): string => {
  const suffixRegex = new RegExp(ISOLUTION_SUFFIX, 'g');

  return content.replace(suffixRegex, newSuffix);
};

type Options = {
  virtualFilesPrefix?: string;
  isolationSuffix?: string;
};

const processCssUnplugin = createUnplugin<Options>((options = {}) => {
  const { virtualFilesPrefix, isolationSuffix } = options;
  const cssFiles = new Map<string, string>();

  return {
    name: 'semcore-process-css-unplugin',
    enforce: 'pre',

    resolveId(id) {
      return cssFiles.has(id) ? id : null;
    },

    loadInclude(id) {
      return cssFiles.has(id);
    },

    load(id) {
      return cssFiles.get(id) ?? null;
    },

    transformInclude(id) {
      return id.includes('@semcore/');
    },

    transform(source, id) {
      const importPaths: string[] = [];
      const isES6Mode = REGEXPS.ES6_IMPORT.test(source);

      const registerCssBlock = (codeBlock: string) => {
        let css = extractCssFromCode(codeBlock);

        if (isolationSuffix) {
          css = replaceIsolationSuffix(css, isolationSuffix);
        }

        const hashedFilePath = generateHashedFilePath(css, virtualFilesPrefix);
        cssFiles.set(hashedFilePath, css);
        importPaths.push(hashedFilePath);
      };

      let transformedCode = source.replace(REGEXPS.RESHADOW_CSS_NEW, (_, codeBlock: string) => {
        registerCssBlock(codeBlock);

        return 'undefined';
      });

      transformedCode = transformedCode.replace(REGEXPS.RESHADOW_CSS_OLD, (_, codeBlock: string) => {
        registerCssBlock(codeBlock);

        // Keep the opening parenthesis if it was a part of the cut block:
        // `(sstyled.insert(...), /*__reshadow_css_end__*/` (esm build) vs `sstyled.insert(...),\n/*__reshadow_css_end__*/` (babel build).
        return /^\s*\(/.test(codeBlock) ? '(undefined, ' : 'undefined, ';
      });

      transformedCode = transformedCode.replace(REGEXPS.RESHADOW_STYLES, () =>
        createImportStatement(importPaths.shift()!, isES6Mode),
      );

      if (isolationSuffix) {
        transformedCode = replaceIsolationSuffix(transformedCode, isolationSuffix);
      }

      return { code: transformedCode };
    },
  };
});

export const processCssVitePlugin: UnpluginInstance<Options>['vite'] = processCssUnplugin.vite;
export const processCssWebpackPlugin: UnpluginInstance<Options>['webpack'] = processCssUnplugin.webpack;
