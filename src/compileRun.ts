"use strict";

import * as vscode from 'vscode';
import * as path from "path";
import * as fs from 'fs';
import { VSCodeUI } from "./VSCodeUI";

export namespace Constants {
    export enum Action {
        Compile,
        Run,
        CompileRun,
        CompileWithFlags,
        RunWithArguments
    }
}

export class CompileRun {
    private _outputChannel: vscode.OutputChannel;
    private _config: vscode.WorkspaceConfiguration;

    readonly Action: Constants.Action;

    constructor() {
        this._outputChannel = vscode.window.createOutputChannel("C/C++ Compile Run");
        this._config = vscode.workspace.getConfiguration("c-cpp-compile-run", null);
    }

    private async compile(currentFile: string, outputFile: string, doRun: boolean = false, withFlags: boolean = false) {
        const spawn = require('child_process').spawn;
        var commandExistsSync = require('command-exists').sync;

        let save = this._config.get<boolean>("save-before-compile");

        if (save) {
            await vscode.window.activeTextEditor.document.save();
        }

        let exec;

        switch (path.parse(currentFile).ext) {
            case '.cpp': {
                let cppCompiler = this.getCPPCompiler();

                if (!commandExistsSync(cppCompiler)) {
                    vscode.window.showErrorMessage("Invalid compiler path, try to change path in settings! (eg. /usr/bin/gcc)");
                    return;
                }

                let cppArgs = [currentFile, '-o', outputFile];

                if (withFlags) {
                    let flagsStr = await this.promptForFlags();
                    if (flagsStr) {
                        let flags = flagsStr.split(" ");
                        cppArgs = cppArgs.concat(flags);
                    }
                }

                exec = spawn(cppCompiler, cppArgs);
                break;
            }
            case '.c': {
                let cCompiler = this.getCCompiler();

                if (!commandExistsSync(cCompiler)) {
                    vscode.window.showErrorMessage("Compiler not found, try to change path in settings!");
                    return;
                }

                let cArgs = [currentFile, '-o', outputFile];

                if (withFlags) {
                    let flagsStr = await this.promptForFlags();
                    if (flagsStr) {
                        let flags = flagsStr.split(" ");
                        cArgs = cArgs.concat(flags);
                    }
                }

                exec = spawn(cCompiler, cArgs);
                break;
            }
            default: {
                return;
            }
        }

        exec.stdout.on('data', (data: any) => {
            this._outputChannel.appendLine(data);
            this._outputChannel.show(true);
        });

        exec.stderr.on('data', (data: any) => {
            this._outputChannel.appendLine(data);
            this._outputChannel.show(true);
        });

        exec.on('close', (data: any) => {
            if (data === 0) {
                // Compiled successfully let's tell the user & execute
                vscode.window.showInformationMessage("Compiled successfuly!");
                if (doRun) {
                    this.run(outputFile);
                }
            } else {
                // Error compiling
                vscode.window.showErrorMessage("Error compiling!");
            }
        });
    }

    private async run(outputFile: string, withArgs: boolean = false) {
        if (!fs.existsSync(outputFile)) {
            vscode.window.showErrorMessage(`"${outputFile}" doesn't exists!`);
            return;
        }

        if (withArgs) {
            let args = await this.promptForRunArgs();
            VSCodeUI.runInTerminal(`"${outputFile}" ${args}`);
        } else {
            VSCodeUI.runInTerminal(`"${outputFile}"`);
        }
    }

    public async compileRun(action: Constants.Action) {
        let currentFile = vscode.window.activeTextEditor.document.fileName;

        if (!currentFile) {
            return;
        }

        let outputFile = path.join(path.parse(currentFile).dir, path.parse(currentFile).name);
        if (process.platform === 'win32') {
            outputFile = outputFile + '.exe';
        }

        switch (action) {
            case Constants.Action.Compile:
                this.compile(currentFile, outputFile);
                break;
            case Constants.Action.Run:
                this.run(outputFile);
                break;
            case Constants.Action.CompileRun:
                this.compile(currentFile, outputFile, true);
                break;
            case Constants.Action.CompileWithFlags:
                this.compile(currentFile, outputFile, false, true);
            case Constants.Action.RunWithArguments:
                this.run(outputFile, true);
                break;
            default: return;
        }
    }

    private getCCompiler(): string {
        const cCompiler = this._config.get<string>("c-compiler");

        if (!cCompiler) {
            return "gcc";
        } else {
            return cCompiler;
        }
    }

    private getCPPCompiler(): string {
        const cppCompiler = this._config.get<string>("cpp-compiler");

        if (!cppCompiler) {
            return "g++";
        } else {
            return cppCompiler;
        }
    }

    private async promptForFlags(): Promise<string | undefined> {
        try {
            return await vscode.window.showInputBox({
                prompt: 'Flags',
                placeHolder: '-Wall -Wextra'
            });
        } catch (e) {
            return null;
        }
    }

    private async promptForRunArgs(): Promise<string | undefined> {
        try {
            return await vscode.window.showInputBox({
                prompt: 'Arguments',
                placeHolder: 'arg'
            });
        } catch (e) {
            return null;
        }
    }
}