/**
 * @file editorconfig.ts
 * @author Krisna Pranav
 * @brief editor config
 * @version 1.0
 * @date 2025-02-13
 *
 * @copyright Copyright (c) 2025 Krisna Pranav
 *
 */

import { execSync } from "node:child_process";

const regExp = /^(.+?)(?:@(.+))?$/;

export const parseDesiredSemver = (
    dependency: string,
): [string, string | undefined] => {
    if (dependency.startsWith("file:") || dependency.startsWith(".")) {
        const name = execSync(`pnpm view ${dependency} name`, {
            encoding: "utf-8",
        }).trimEnd();
    }

    const result = dependency.match(regExp);

    if (!result || !result[1]) {
        throw new Error(`Invalid dependency string: ${dependency}`);
    }

    return [result[1], result[2]];
}