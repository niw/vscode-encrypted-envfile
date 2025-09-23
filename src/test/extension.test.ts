import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { EncryptedDotenvDebugConfigProvider } from '../extension';
import * as cp from 'child_process';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Debug Config Provider preserves existing debug configurations', async () => {
    const provider = new EncryptedDotenvDebugConfigProvider();
    const debugConfiguration: vscode.DebugConfiguration = {
      type: 'node',
      request: 'launch',
      name: 'Test Launch',
      env: {
        'EXISTING_VAR': 'existing_value'
      }
    };

    const resolvedDebugConfiguration = await provider.resolveDebugConfigurationWithSubstitutedVariables(undefined, debugConfiguration);

    assert.strictEqual(resolvedDebugConfiguration, debugConfiguration);
  });

  test('Debug Config Provider decrypts encrypted env file and adds env vars', async () => {
    const provider = new EncryptedDotenvDebugConfigProvider({
      existsSync: (_path: string) => true,
      execFile: (file: string, args: string[], _options: cp.ExecFileOptions, callback: any) => {
        const expectedArgs = ['--decrypt', '/mock/path/.env.encrypted'];
        if (file === 'gpg' && args.length === expectedArgs.length && args.every((val, index) => val === expectedArgs[index])) {
          callback(null, 'TEST=test', '');
        } else {
          callback(new Error('Unknown command'), '', '');
        }
        return {} as any;
      }
    });

    const debugConfiguration: vscode.DebugConfiguration = {
      type: 'node',
      request: 'launch',
      name: 'Test Launch',
      encryptedEnvFile: '.env.encrypted',
    };

    const workspaceFolder: vscode.WorkspaceFolder = {
      uri: vscode.Uri.file('/mock/path'),
      name: 'mock',
      index: 0
    };

    await provider.resolveDebugConfigurationWithSubstitutedVariables(workspaceFolder, debugConfiguration);

    assert.strictEqual(debugConfiguration.env['TEST'], 'test');
  });

  test('Debug Config Provider supports custom program and args', async () => {
    const provider = new EncryptedDotenvDebugConfigProvider({
      existsSync: (_path: string) => true,
      execFile: (file: string, args: string[], _options: cp.ExecFileOptions, callback: any) => {
        const expectedArgs = ['--custom-arg', '/mock/path/.env.encrypted'];
        if (file === 'gpg' && args.length === expectedArgs.length && args.every((val, index) => val === expectedArgs[index])) {
          callback(null, 'TEST=test', '');
        } else {
          callback(new Error(`Unexpected command: ${file} ${args.join(' ')}`), '', '');
        }
        return {} as any;
      }
    });

    const config: vscode.DebugConfiguration = {
      type: 'node',
      request: 'launch',
      name: 'Test Launch',
      encryptedEnvFile: '.env.encrypted',
      encryptedEnvFileDecryptProgram: 'gpg',
      encryptedEnvFileDecryptArgs: ['--custom-arg', '${encryptedEnvFile}']
    };

    const workspaceFolder: vscode.WorkspaceFolder = {
      uri: vscode.Uri.file('/mock/path'),
      name: 'mock',
      index: 0
    };

    await provider.resolveDebugConfigurationWithSubstitutedVariables(workspaceFolder, config);

    assert.strictEqual(config.env['TEST'], 'test');
  });
});