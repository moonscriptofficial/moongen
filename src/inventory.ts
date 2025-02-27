/**
 * @file inventory.ts
 * @author Krisna Pranav
 * @brief inventory
 * @version 1.0
 * @date 2025-02-13
 *
 * @copyright Copyright (c) 2025 Krisna Pranav
 *
 */

import * as fs from "fs";
import * as path from "path";
import { unzipSync } from "zlib";
import { snake } from "case";

const PROJEN_MODULE_ROOT = path.join(__dirname, "..");
const PROJECT_BASE_FQN = "projen.Project";

type JsiiTypes = { [name: string]: JsiiType };

export interface ProjectOption {
    path: string[];
    name: string;
    fqn?: string;
    switch: string;
    simpleType: string;
    fullType: JsiiPropertyType;
    kind?: "class" | "enum" | "interface";
    jsonLike?: boolean;
    parent: string;
    docs?: string;
    default?: string;
    initialValue?: string;
    optional?: boolean;
    deprecated?: boolean;
    featured?: boolean;
}

export interface ProjectType {
    moduleName: string;
    pjid: string;
    fqn: string;
    typename: string;
    options: ProjectOption[];
    docs?: string;
    docsurl: string;
}

interface JsiiType {
    name: string;
    assembly: string;
    kind: string;
    abstract?: boolean;
    base?: string;
    fqn: string;
    interfaces?: string[];
    initializer?: {
        parameters?: Array<{
            name: string;
            type?: { fqn?: string };
        }>;
    };
    properties?: Array<{
        name: string;
        docs: {
            summary?: string;
            default?: string;
            deprecated?: string;
            stability?: string;
            custom?: { [name: string]: string };
        };
        optional?: boolean;
        type?: JsiiPropertyType;
    }>;
    docs?: {
        summary?: string;
        deprecated?: string;
        custom?: {
            pjid?: string;
            pjnew?: string;
        };
    };
}

export interface JsiiPropertyType {
    primitive?: string;
    fqn?: string;
    collection?: {
        elementtype: JsiiPropertyType;
        kind: string;
    };
}

export function discover(...moduleDirs: string[]): ProjectType[] {
    const jsii = discoverJsiiTypes(...moduleDirs);

    const result = new Array<ProjectType>();

    for (const fqn of Object.keys(jsii)) {
        if (isProjectType(jsii, fqn)) {
            const p = toProjectType(jsii, fqn);
            result.push(p);
        }
    }

    return result.sort((r1, r2) => r1.pjid.localeCompare(r2.pjid));
}

export function readManifest(dir: string) {
    const jsiiFile = path.join(dir, ".jsii");

    if (!fs.existsSync(jsiiFile)) {
        return undefined;
    }

    let manifest = JSON.parse(fs.readFileSync(jsiiFile, "utf-8"));

    if (manifest.schema === "jsii/file-redirect") {
        const compressedFile = path.join(dir, manifest.filename);

        if (!fs.existsSync(compressedFile)) {
            throw new Error(`${compressedFile} does not exist.`);
        }

        switch (manifest.compression) {
            case "gzip":
                manifest = JSON.parse(
                    unzipSync(fs.readFileSync(compressedFile)).toString(),
                );
                break;
            default:
                throw new Error(
                    `Unsupported compression format: ${manifest.compression}`,
                );
        }
    }

    return manifest;
}

function discoverJsiiTypes(...moduleDirs: string[]) {
    const jsii: JsiiTypes = {};
    const discoveredManifests: Array<string> = [];

    const discoverJsii = (dir: string) => {
        const manifest = readManifest(dir);

        if (!manifest) {
            return;
        }

        if (discoveredManifests.includes(manifest.fingerprint)) {
            return;
        }
        discoveredManifests.push(manifest.fingerprint);

        for (const [fqn, type] of Object.entries(manifest.types as JsiiTypes)) {
            jsii[fqn] = {
                ...type,
            };
        }

        if (manifest.dependencies) {
            for (const dependency of Object.keys(manifest.dependencies)) {
                const nestedDependencyFolder = path.dirname(
                    require.resolve(`${dependency}/package.json`, {
                        paths: [dir],
                    }),
                );

                if (fs.existsSync(nestedDependencyFolder)) {
                    discoverJsii(nestedDependencyFolder);
                }
            }
        }
    };

    for (const dir of [...moduleDirs, PROJEN_MODULE_ROOT]) {
        discoverJsii(dir);

        if (dir.includes("@") && fs.lstatSync(dir).isDirectory()) {
            const childDirs = fs.readdirSync(dir).map((file) => path.join(dir, file));
            for (const child of childDirs) {
                discoverJsii(child);
            }
        }
    }

    return jsii;
}

export function resolveProjectType(projectFqn: string): ProjectType {
    let [moduleName] = projectFqn.split(".");
    if (moduleName === "projen") {
        moduleName = PROJEN_MODULE_ROOT;
    }

    const jsiiManifestFile = require.resolve(`${moduleName}/.jsii`, {
        paths: [process.cwd()],
    });
    const moduleFolder = path.dirname(jsiiManifestFile);

    const jsii = discoverJsiiTypes(moduleFolder);
    return toProjectType(jsii, projectFqn);
}

export function toProjectType(jsii: JsiiTypes, fqn: string): ProjectType {
    if (!isProjectType(jsii, fqn)) {
        throw new Error(
            `Fully qualified name "${fqn}" is not a valid project type.`,
        );
    }

    const typeinfo = jsii[fqn];

    const typename = fqn.substring(fqn.indexOf(".") + 1);

    const docsurl = `https://projen.io/api/API.html#projen-${typename
        .toLocaleLowerCase()
        .replace(/\./g, "-")}`;
    let pjid =
        typeinfo.docs?.custom?.pjid ?? snake(typename).replace(/_project$/, "");
    return {
        moduleName: typeinfo.assembly,
        typename,
        pjid,
        fqn,
        options: discoverOptions(jsii, fqn),
        docs: typeinfo.docs?.summary,
        docsurl,
    } as ProjectType;
}

export function readJsiiManifest(jsiiFqn: string): any {
    let [moduleName] = jsiiFqn.split(".");
    if (moduleName === "projen") {
        moduleName = PROJEN_MODULE_ROOT;
    }

    const jsiiManifestFile = require.resolve(`${moduleName}/.jsii`);
    return JSON.parse(fs.readFileSync(jsiiManifestFile, "utf-8"));
}

function discoverOptions(jsii: JsiiTypes, fqn: string): ProjectOption[] {
    const options: { [name: string]: ProjectOption } = {};
    const params = jsii[fqn]?.initializer?.parameters ?? [];
    const optionsParam = params[0];
    const optionsTypeFqn = optionsParam?.type?.fqn;

    if (
        params.length > 1 ||
        (params.length === 1 && optionsParam?.name !== "options")
    ) {
        throw new Error(
            `constructor for project ${fqn} must have a single "options" argument of a struct type. got ${JSON.stringify(
                params,
            )}`,
        );
    }

    addOptions(optionsTypeFqn);

    const opts = Object.values(options);

    return opts.sort((a, b) => a.name.localeCompare(b.name));

    function addOptions(
        ofqn?: string,
        basePath: string[] = [],
        optional = false,
    ) {
        if (!ofqn) {
            return;
        }

        const struct = jsii[ofqn];
        if (!struct) {
            throw new Error(`unable to find options type ${ofqn} for project ${fqn}`);
        }

        for (const prop of struct.properties ?? []) {
            const propPath = [...basePath, prop.name];

            if (prop.name in options) {
                throw new Error(
                    `duplicate option "${prop.name}" in ${fqn} (already declared in ${options[prop.name].parent
                    })`,
                );
            }

            let jsiiKind;
            if (prop.type?.fqn) {
                jsiiKind = jsii[prop.type?.fqn].kind;
            }

            const isOptional = optional || prop.optional;
            const defaultValue = sanitizeValue(prop.docs?.default);
            const pjnew = sanitizeValue(prop.docs?.custom?.pjnew);

            const initialValue = getInitialValue(defaultValue, pjnew, isOptional);
            if (initialValue) {
                checkDefaultIsParsable(prop.name, initialValue, prop.type);
            }

            options[prop.name] = filterUndefined({
                path: propPath,
                parent: struct.name,
                name: prop.name,
                fqn: prop.type?.fqn,
                docs: prop.docs.summary,
                simpleType: prop.type ? getSimpleTypeName(prop.type) : "unknown",
                fullType: prop.type,
                kind: jsiiKind,
                jsonLike: prop.type ? isJsonLike(jsii, prop.type) : undefined,
                switch: propPath.map((p) => snake(p).replace(/_/g, "-")).join("-"),
                default: defaultValue,
                initialValue: initialValue,
                optional: isOptional,
                featured: prop.docs?.custom?.featured === "true",
                deprecated: prop.docs.stability === "deprecated" ? true : undefined,
            });
        }

        for (const ifc of struct.interfaces ?? []) {
            addOptions(ifc);
        }
    }
}

function getInitialValue(
    defaultValue?: string,
    pjnew?: string,
    isOptional: boolean = false,
) {
    if (pjnew) {
        return pjnew;
    }

    if (!isOptional) {
        return defaultValue;
    }

    return undefined;
}

function sanitizeValue(val?: string) {
    if (val === "undefined") {
        return undefined;
    }

    return val;
}

function getSimpleTypeName(type: JsiiPropertyType): string {
    if (type?.primitive) {
        return type.primitive;
    } else if (type?.fqn) {
        return type.fqn.split(".").pop()!;
    } else {
        return "unknown";
    }
}

function isJsonLike(jsii: JsiiTypes, type: JsiiPropertyType): boolean {
    if (type.primitive) {
        return true;
    } else if (type.fqn) {
        const kind = jsii[type.fqn].kind;
        if (["interface", "enum"].includes(kind)) {
            return true;
        }
    } else if (type.collection) {
        return isJsonLike(jsii, type.collection.elementtype);
    }
    return false;
}

function filterUndefined(obj: any) {
    const ret: any = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined) {
            ret[k] = v;
        }
    }
    return ret;
}

function isProjectType(jsii: JsiiTypes, fqn: string) {
    const type = jsii[fqn];

    if (!type) {
        throw new Error(
            `Could not find project type with fqn "${fqn}" in  .jsii file.`,
        );
    }

    if (type.kind !== "class") {
        return false;
    }
    if (type.abstract) {
        return false;
    }

    if (type.docs?.deprecated) {
        return false;
    }

    let curr = type;
    while (true) {
        if (curr.fqn === PROJECT_BASE_FQN) {
            return true;
        }

        if (!curr.base) {
            return false;
        }

        curr = jsii[curr.base];
        if (!curr) {
            return false;
        }
    }
}

function isPrimitiveArray({ collection }: JsiiPropertyType) {
    return Boolean(
        collection?.kind === "array" && collection?.elementtype.primitive,
    );
}

function isPrimitiveOrPrimitiveArray(type: JsiiPropertyType) {
    return Boolean(type?.primitive || isPrimitiveArray(type));
}

function checkDefaultIsParsable(
    prop: string,
    value: string,
    type?: JsiiPropertyType,
) {
    if (!(type && isPrimitiveOrPrimitiveArray(type))) {
        throw new Error(
            `required option "${prop}" with a @default must use primitive types (string, number and boolean) or a primitive array. type found is: ${JSON.stringify(
                type,
            )}`,
        );
    }

    if (value.startsWith("$")) {
        return;
    }

    try {
        const parsed = JSON.parse(value);

        if (typeof parsed === type.primitive) {
            return;
        }

        if (Array.isArray(parsed) && isPrimitiveArray(type)) {
            if (parsed.length === 0) {
                return;
            }

            if (typeof parsed[0] === type?.collection?.elementtype.primitive) {
                return;
            }
        }

        throw new Error(
            `cannot parse @default value for mandatory option ${prop} as a ${type}: ${parsed}`,
        );
    } catch (e) {
        throw new Error(
            `unable to JSON.parse() value "${value}" specified as @default for mandatory option "${prop}": ${(e as any).message
            }`,
        );
    }
}