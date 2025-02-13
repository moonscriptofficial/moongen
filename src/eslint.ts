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

import { Component, IgnoreFile, JsonFile } from "projen";
import { NodeProject } from "./node_project";

export class Eslint extends Component {
    constructor(project: NodeProject) {
        super(project);

        const ignore = new IgnoreFile(project, ".eslintignore");
        ignore.addPatterns("/.turbo", "/dist", "/lib", "/node_modules/");
    }
}