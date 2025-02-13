/**
 * @file render-options.ts
 * @author Krisna Pranav
 * @brief render options
 * @version 1.0
 * @date 2025-02-13
 *
 * @copyright Copyright (c) 2025 Krisna Pranav
 *
 */

import * as inventory from "./inventory.js";
import { InitProjectOptionHints } from "./option-hints.js";

const PROJEN_NEW = "__new__";
const TAB = makePadding(2);

export interface RenderProjectOptions {
    readonly type: inventory.ProjectType;
    readonly args: Record<string, any>;
    readonly comments?: InitProjectOptionHints;
    readonly bootstrap?: boolean;
    readonly omitFromBootstrap?: string[];
    readonly prefixImports?: string;
}

interface ProjenInit {
    readonly fqn: string;
    readonly args: Record<string, any>;
    readonly comments: InitProjectOptionHints;
}

export function renderProjenInitOptions(
    fqn: string,
    args: Record<string, any>,
    comments: InitProjectOptionHints = InitProjectOptionHints.NONE,
): any {
    return {
        ...args,
        [PROJEN_NEW]: { fqn, args, comments } as ProjenInit,
    };
}

export function resolveInitProject(opts: any) {
    const f = opts[PROJEN_NEW] as ProjenInit;
    if (!f) {
        return undefined;
    }

    const type = inventory.resolveProjectType(f.fqn);
    if (!type) {
        throw new Error(`unable to resolve project type for ${f.fqn}`);
    }
    return {
        args: f.args,
        fqn: f.fqn,
        type: type,
        comments: f.comments,
    };
}

export class ModuleImports {
    private imports: Map<string, Set<string>> = new Map();

    public add(moduleName: string, importName: string) {
        const moduleImports = this.imports.get(moduleName) ?? new Set();
        moduleImports.add(importName);
        this.imports.set(moduleName, moduleImports);
    }

    public get(moduleName: string): string[] {
        const moduleImports = this.imports.get(moduleName) ?? new Set();
        return Array.from(moduleImports);
    }

    public get modules(): string[] {
        return Array.from(this.imports.keys());
    }

    public asEsmImports(): string[] {
        return this.all().map(
            ([moduleName, namedImports]) =>
                `import { ${[...namedImports].join(", ")} } from "${moduleName}";`,
        );
    }

    public asCjsRequire(): string[] {
        return this.all().map(
            ([moduleName, namedImports]) =>
                `const { ${[...namedImports].join(", ")} } = require("${moduleName}");`,
        );
    }

    private all(): Array<[string, string[]]> {
        const allImports = Object.fromEntries(this.imports);
        return Object.entries(allImports).map(([key, value]) => [
            key,
            Array.from(value).sort(),
        ]);
    }
}

export function renderJavaScriptOptions(opts: RenderProjectOptions): {
    renderedOptions: string;
    imports: ModuleImports;
} {
    const renders: Record<string, string> = {};
    const optionsWithDefaults: string[] = [];
    const allImports = new ModuleImports();

    for (const option of opts.type.options) {
        if (option.deprecated) {
            continue;
        }

        const optionName = option.name;

        if (opts.args[optionName] !== undefined) {
            const arg = opts.args[optionName];
            const { js, moduleName, importName } = renderArgAsJavaScript(arg, option);

            renders[optionName] = `${optionName}: ${js},`;
            optionsWithDefaults.push(optionName);

            if (moduleName && importName) {
                allImports.add(moduleName, importName);
                if (opts.prefixImports) {
                    const prefix = `${opts.prefixImports}["${moduleName}"].`;
                    renders[optionName] = `${optionName}: ${prefix}${js},`;
                }
            }
        } else {
            const defaultValue = option.default?.startsWith("-")
                ? undefined
                : option.default ?? undefined;
            renders[optionName] = `// ${optionName}: ${defaultValue},`;
        }
    }

    const bootstrap = opts.bootstrap ?? false;
    if (bootstrap) {
        for (const arg of opts.omitFromBootstrap ?? []) {
            delete opts.args[arg];
        }
        renders[PROJEN_NEW] = `${PROJEN_NEW}: ${JSON.stringify({
            args: opts.args,
            fqn: opts.type.fqn,
            comments: opts.comments,
        } as ProjenInit)},`;
        optionsWithDefaults.push(PROJEN_NEW);
    }

    const result: string[] = [];
    result.push("{");

    optionsWithDefaults.sort();

    for (const optionName of optionsWithDefaults) {
        result.push(`${TAB}${renders[optionName]}`);
    }

    if (result.length > 1) {
        result.push("");
    }

    if (opts.comments === InitProjectOptionHints.ALL) {
        const options = opts.type.options.filter(
            (opt) => !opt.deprecated && opts.args[opt.name] === undefined,
        );
        result.push(...renderCommentedOptionsByModule(renders, options));
    } else if (opts.comments === InitProjectOptionHints.FEATURED) {
        const options = opts.type.options.filter(
            (opt) =>
                !opt.deprecated && opts.args[opt.name] === undefined && opt.featured,
        );
        result.push(...renderCommentedOptionsInOrder(renders, options));
    } else if (opts.comments === InitProjectOptionHints.NONE) {
    }

    if (result[result.length - 1] === "") {
        result.pop();
    }
    result.push("}");
    return { renderedOptions: result.join("\n"), imports: allImports };
}

function renderCommentedOptionsByModule(
    renders: Record<string, string>,
    options: inventory.ProjectOption[],
) {
    const optionsByModule: Record<string, inventory.ProjectOption[]> = {};

    for (const option of options) {
        const parentModule = option.parent;
        optionsByModule[parentModule] = optionsByModule[parentModule] ?? [];
        optionsByModule[parentModule].push(option);
    }

    for (const parentModule in optionsByModule) {
        optionsByModule[parentModule].sort((o1, o2) =>
            o1.name.localeCompare(o2.name),
        );
    }

    const result = new Array<string>();
    const marginSize = Math.max(
        ...options.map((opt) => renders[opt.name].length),
    );

    for (const [moduleName, optionGroup] of Object.entries(
        optionsByModule,
    ).sort()) {
        result.push(`${TAB}/* ${moduleName} */`);
        for (const option of optionGroup) {
            const paramRender = renders[option.name];
            const docstring = option.docs || "No documentation found.";
            result.push(
                `${TAB}${paramRender}${makePadding(
                    marginSize - paramRender.length + 2,
                )}/* ${docstring} */`,
            );
        }
        result.push("");
    }
    return result;
}

function renderCommentedOptionsInOrder(
    renders: Record<string, string>,
    options: inventory.ProjectOption[],
) {
    const result = new Array<string>();
    const marginSize = Math.max(
        ...options.map((opt) => renders[opt.name].length),
    );
    for (const option of options) {
        const paramRender = renders[option.name];
        const docstring = option.docs || "No documentation found.";
        result.push(
            `${TAB}${paramRender}${makePadding(
                marginSize - paramRender.length + 2,
            )}/* ${docstring} */`,
        );
    }
    return result;
}

function renderArgAsJavaScript(arg: any, option: inventory.ProjectOption) {
    if (option.kind === "enum") {
        if (!option.fqn) {
            throw new Error(`fqn field is missing from enum option ${option.name}`);
        }
        const parts = option.fqn.split(".");
        const enumChoice = String(arg).toUpperCase().replace(/-/g, "_");
        const js = `${parts.slice(1).join(".")}.${enumChoice}`;
        const moduleName = parts[0];
        const importName = parts[1];
        return { js, moduleName, importName };
    } else if (option.jsonLike) {
        return { js: JSON.stringify(arg) };
    } else {
        throw new Error(
            `Unexpected option ${option.name} - cannot render a value for this option because it does not have a JSON-like type.`,
        );
    }
}

function makePadding(paddingLength: number): string {
    return " ".repeat(paddingLength);
}