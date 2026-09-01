# Bro It

Highlight text on a webpage and either get a short ELI5 explanation or a direct answer underneath it.

Bro It is a small Chrome extension for macOS. It sends the selected text and its surrounding paragraph to your already logged-in Codex CLI, using `gpt-5.6-luna` with low reasoning effort.

## Requirements

- macOS
- Google Chrome
- Node.js 18 or newer
- [Codex CLI](https://learn.chatgpt.com/docs/developer-commands?surface=cli), logged in with `codex login`
- Access to `gpt-5.6-luna`

## Install

```sh
git clone https://github.com/KanhavBhatnagar560/bro-it.git
cd bro-it
./scripts/install.sh
```

The installer prints the extension folder to load. Then:

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Choose the `extension` folder inside this repository.

## Use

1. Highlight a word, passage, or question on a regular webpage.
2. Right-click the selection and open **Bro It**.
3. Choose **Bro it — explain simply** for an ELI5 explanation, or **Answer it — answer the question** for a direct answer.
4. After an Answer result, use the box underneath it to ask follow-up questions.
5. Click elsewhere or press Escape to dismiss the result.

Explain mode is limited to 2–4 short sentences; Answer mode is limited to 1–4 concise sentences. Bro It supports selections up to 4,000 characters and sends at most 8,000 characters of surrounding context.

## Privacy and security

Bro It sends data only after you explicitly choose **Bro it**. It sends:

- The exact highlighted text.
- The nearest containing paragraph or block.

The extension does not read your clipboard, save browsing history, or keep Codex conversations. The native helper invokes a fixed `codex exec` command without a shell, uses an empty read-only workspace, ignores user/project rules and MCP configuration, and deletes its temporary output after each request. Page text is treated as untrusted quoted data and is never used as a command.

## Test

```sh
npm test
```

## Troubleshooting

- **Helper not installed:** Run `./scripts/install.sh` again, then reload the extension.
- **Codex is not logged in:** Run `codex login`, then reinstall.
- **Luna is unavailable:** Your Codex account must have access to `gpt-5.6-luna`; Bro It does not silently switch models.
- **Codex failed:** Check `~/Library/Application Support/Bro It/host.log` for a sanitized error code, then rerun `./scripts/install.sh` after updating.
- **No menu item:** Reload Bro It from `chrome://extensions` and try a normal `http` or `https` webpage. Chrome internal pages are intentionally unsupported.

## Uninstall

```sh
./scripts/uninstall.sh
```

Then remove Bro It from `chrome://extensions`.

## Current scope

Version 0.3 supports Google Chrome on macOS. It intentionally skips streaming, saved conversations, prompt settings, Safari, Windows, and other Chromium browsers until the basic workflow proves useful.

## License

MIT
