import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('*', new EncryptedDotenvDebugConfigProvider()));
}

export interface Injection {
  existsSync(path: string): boolean;
  execFile(file: string, args: ReadonlyArray<string> | undefined | null, options: cp.ExecFileOptions | undefined | null, callback: (error: cp.ExecFileException | null, stdout: string, stderr: string) => void): cp.ChildProcess;
}

export class EncryptedDotenvDebugConfigProvider implements vscode.DebugConfigurationProvider {
  constructor(private injection: Injection = { existsSync: fs.existsSync, execFile: cp.execFile }) { }

  async resolveDebugConfigurationWithSubstitutedVariables(folder: vscode.WorkspaceFolder | undefined, debugConfiguration: vscode.DebugConfiguration, _token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {
    if (!debugConfiguration.encryptedEnvFile) {
      return debugConfiguration;
    }

    let encryptedEnvPath = debugConfiguration.encryptedEnvFile as string;
    if (folder && !path.isAbsolute(encryptedEnvPath)) {
      encryptedEnvPath = path.join(folder.uri.fsPath, encryptedEnvPath);
    }

    if (!this.injection.existsSync(encryptedEnvPath)) {
      return debugConfiguration;
    }

    try {
      const decryptProgram = debugConfiguration.encryptedEnvFileDecryptProgram || 'gpg';

      let decryptArgs = debugConfiguration.encryptedEnvFileDecryptArgs || ['--decrypt', encryptedEnvPath];
      decryptArgs = decryptArgs.map((arg: string) => {
        return arg.replace('${encryptedEnvFile}', encryptedEnvPath);
      });

      const decrypted = await new Promise<string>((resolve, reject) => {
        this.injection.execFile(decryptProgram, decryptArgs, { shell: true }, (err, stdout, _stderr) => {
          if (err) {
            reject(err);
          } else {
            resolve(stdout);
          }
        });
      });

      const parsed = dotenv.parse(decrypted);

      debugConfiguration.env = debugConfiguration.env || {};

      for (const key in parsed) {
        if (Object.prototype.hasOwnProperty.call(parsed, key)) {
          if (!debugConfiguration.env[key]) {
            debugConfiguration.env[key] = parsed[key];
          }
        }
      }
    } catch (error) {
      console.error(`Failed to decrypt ${encryptedEnvPath}:`, error);
    }

    return debugConfiguration;
  }
}

export function deactivate() { }
