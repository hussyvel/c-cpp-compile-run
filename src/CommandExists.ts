let execSync = require('child_process').execSync;
let fs = require('fs');
let accessSync = fs.accessSync;
let constants = fs.constants || fs;

let isUsingWindows = process.platform === 'win32';

export function fileNotExistsSync (command : string) {
    try {
        accessSync(command, constants.F_OK);
        return false;
    } catch (e) {
        return true;
    }
}

export function localExecutableSync (command : string) {
    try {
        accessSync(command, constants.F_OK | constants.X_OK);
        return true;
    } catch (e) {
        return false;
    }
}

export function commandExistsUnixSync(command: string) {
    if (fileNotExistsSync(command)) {
        try {
            var stdout = execSync('command -v ' + command +
                ' 2>/dev/null' +
                ' && { echo >&1 ' + command + '; exit 0; }'
            );
            return !!stdout;
        } catch (error) {
            return false;
        }
    }
    return localExecutableSync(command);
}

export function commandExistsWindowsSync (command : string) {
    if (/[\x00-\x1f<>:"\|\?\*]/.test(command)) {
        return false;
    }
    try {
        var stdout = execSync('where ' + command, { stdio: [] });
        return !!stdout;
    } catch (error) {
        return false;
    }
}

export function commandExists(command: string) {
    if (isUsingWindows) {
        return commandExistsWindowsSync(command);
    } else {
        return commandExistsUnixSync(command);
    }
}