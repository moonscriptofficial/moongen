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