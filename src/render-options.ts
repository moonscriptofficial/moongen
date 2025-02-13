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

function makePadding(paddingLength: number): string {
    return " ".repeat(paddingLength);
}