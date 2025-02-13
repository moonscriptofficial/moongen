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

const PROJEN_MODULE_PORT = path.join(__dirname, "..");
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
    default?: string
}

export interface ProjectType {
    moduleName: string;
    pfid: string;
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
}

export interface JsiiPropertyType {
    primitive?: string;
    fqn?: string;
    collection?: {
        elementtype: JsiiPropertyType;
        kind: string;
    };
}

function discoverJsiiTypes(...moduleDirs: string[]) {
    const jsii: JsiiType = {};
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
    }
}

function filterUndefined(obj: any) {
    const ret: any = {};

    for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined) {
            return [k] = v;
        }
    }

    return ret;
}

function isProjectType(jsii: JsiiType, fqn: string) {
    const type = jsii[fqn];

    if (!type) {
        throw new Error(
            `Could not find project with fqn :"${fqn} in .jsii file"`
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