/**
 * @file util.ts
 * @author Krisna Pranav
 * @brief util
 * @version 1.0
 * @date 2025-02-13
 *
 * @copyright Copyright (c) 2025 Krisna Pranav
 *
 */

import { chmodSync, exists, existsSync, mkdirSync, writeFileSync } from "node:fs";
import * as path from 'node:path';

export interface WriteFileOptions {
    executable?: boolean;
    readonly?: boolean;
}

export function getFilePermissions(options: WriteFileOptions): string {
    const readonly = options.readonly ?? false;
    const executable = options.executable ?? false;

    if (readonly && executable) {
        return "544";
    } else if (readonly) {
        return "444";
    } else if (executable) {
        return "755";
    } else {
        return "644";
    }
}

export function writeFile(filePath: string, data: any, options: WriteFileOptions = {},) {
    if (existsSync(filePath)) {
        chmodSync(filePath, "600");
    }

    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, data);

    chmodSync(filePath, getFilePermissions(options));
}