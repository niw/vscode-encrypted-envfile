Encrypted Envfile
=================

A very simple Visual Studio Code extension to decrypt encrypted env file
and set environment variables while the debug launch.


Usage
-----

Use `@vscode/vsce` to build vsix package and install it to Visual Studio Code.

```bash
npx @vscode/vsce package
```

Generate a key pair `dotenv` for example, then encrypt `.env` file by using using `gpg`.

```bash
gpg --quick-generate-key dotenv default default none
gpg --encrypt --recipient dotenv --armor --output .env.encrypted .env
```

Add following configuration to your `launch.json`.

```jsonc
{
  // ...
  "configurations": [
    {
      // ...
      "encryptedEnvFile": "${workspaceFolder}/.env.enctypted"
    }
  ]
}
```

When lauching app for debugging, it will decrypt `.env.encrypted` by `gpg`
and set environment variables.
