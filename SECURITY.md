# Security Policy

## Supported Versions

This project is a single local JavaScript file. Only the latest version on the `main` branch is supported.

## Security Notes

Custom CSS and JS Loader injects JavaScript into VS Code's workbench. Only load scripts you understand
and trust.

This project should be loaded from a local file path, for example:

```json
"vscode_custom_css.imports": [
  "file:///C:/Users/your-name/vscode-neovide-cursor-lite/cursor-trail.js"
]
```

Avoid remote URLs in `vscode_custom_css.imports`.

## Reporting A Vulnerability

If you find a security issue, please open a GitHub issue with:

- a short description,
- reproduction steps,
- the VS Code version,
- the extension/version used for custom CSS injection.

Do not include private tokens, credentials, or sensitive local file paths in public issues.
