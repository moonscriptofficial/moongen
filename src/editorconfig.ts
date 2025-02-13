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

import { Component, Project, TextFile } from "projen";

export class editorconfig extends Component {
    constructor(project: Project) {
        super(project);

        new TextFile(project, ".editorconfig", {
            marker: true,
            lines: [

            ]
        })
    }
}