# Book-to-Skill

Turn books and documents into reusable Skills.

`book-to-skill` helps you package books and documents into portable Skill packages, install them, and use them through a CLI host.

## Features

- Package books and documents into Skills in the Web app
- Download each Skill as a portable `.tar.gz`
- Install Skills locally or globally
- Manage multiple installed Skills from one host shell
- Enter persistent chat mode with any selected Skill
- Switch between Skills without leaving the host

## Supported Input Formats

The Web packaging flow currently supports:

- `.epub`
- `.pdf`
- `.doc`
- `.docx`
- `.txt`
- `.md`

For EPUB files, the system preserves chapter-aware structure when possible.

## Quick Start

### 1. Install `book-to-skill`

After installation, you will have this command:

```bash
book-to-skill
```

### 2. Get a Skill package

You can get a Skill package in two ways:

- Create one in the Web app and download the generated `.tar.gz`
- Download a published `.tar.gz` from a source such as GitHub Releases

### 3. Open the host shell

```bash
book-to-skill chat
```

Or open it with an already installed Skill id:

```bash
book-to-skill chat pyramid-writing-skill
```

### 4. Install a Skill package and enter the host

```bash
book-to-skill chat ./pyramid-writing-skill.tar.gz
```

Or from a remote URL:

```bash
book-to-skill chat https://example.com/my-skill.tar.gz
```

This will:

- install the Skill
- enter the host shell
- let you choose a Skill manually with `/skill`
- keep the newly installed Skill inactive until you select it

### 5. Choose a Skill

Inside the host:

```text
/skill
```

Then select one installed Skill to continue in Codex.

After selection, the host will:

- sync/install the selected Skill to Codex at `~/.codex/skills/<skill-id>`
- print `Installed Codex skill: ...`
- auto-launch Codex if the `codex` command exists
- otherwise tell you the Skill is already installed at `~/.codex/skills/<skill-id>`, then let you open Codex manually

## Common Examples

### Open the host directly

```bash
book-to-skill chat
```

### Open the host with an installed Skill id

```bash
book-to-skill chat pyramid-writing-skill
```

### Install a local package and enter the host

```bash
book-to-skill chat ./pyramid-writing-skill.tar.gz
```

### Install a remote package and enter the host

```bash
book-to-skill chat https://example.com/my-skill.tar.gz
```

### Install globally

```bash
book-to-skill chat ./my-skill.tar.gz --global
```

## Host Model

`book-to-skill` uses a **host shell + skill session** model.

### Host shell

The host shell is the top-level environment where you:

- install Skills
- list or find installed Skills
- choose which Skill to use
- switch between Skills

### Skill session

After selecting a Skill, you enter that Skill’s persistent chat mode.

In that mode, normal text input is sent to the current Skill until you reset, switch, or exit.

## Why Skills Are Chosen Manually

Even when you start with a `.tar.gz` or URL, the host does **not** auto-enter that Skill immediately.

Instead, it:

- installs the Skill
- opens the host shell
- waits for you to choose the active Skill with `/skill`

After you choose one Skill, the host syncs it to Codex and then launches Codex when available.

This keeps the workflow consistent when multiple Skills are installed.

## Commands

### Host commands

- `/skill` — choose or switch Skills
- `/help` — show help
- `/info` — show current host status
- `/exit` — exit the host
- `/quit` — exit the host

### Skill session commands

- `/help` — show Skill usage
- `/inputs` — show supported input fields
- `/reset` — clear current session context
- `/info` — show current Skill info
- `/skill` — switch Skills
- `/exit` — exit the host
- `/quit` — exit the host

## Installation Paths

### Default user installation

```bash
~/.book-to-skill/skills
```

### Generated Codex Skill installation

```bash
~/.codex/skills/<skill-id>
```

### Global installation

Use `--global` to install into the global Skill store.

## Recommended User Flows

### Use a newly downloaded Skill

1. Download a `.tar.gz`
2. Run:

```bash
book-to-skill chat ./pyramid-writing-skill.tar.gz
```

3. Enter the host
4. Run:

```text
/skill
```

5. Select the new Skill
6. The Skill is synced to `~/.codex/skills/<skill-id>` and Codex opens (if available)
7. In Codex, type your request naturally, for example:

```text
Help me use pyramid-writing-skill to draft an outline for ...
```

### Use an existing installed Skill

1. Run:

```bash
book-to-skill chat
```

2. Use:

```text
/skill
```

3. Select a Skill
4. The selected Skill is synced to `~/.codex/skills/<skill-id>`
5. Continue in Codex (auto-opened when `codex` exists), or open Codex manually if needed

## Project Structure

`book-to-skill` has three layers:

- **Web packaging layer** — turns documents into Skill packages
- **Skill package layer** — distributes each Skill as a portable `.tar.gz`
- **CLI host layer** — installs, manages, selects, and chats with Skills

## Status

`book-to-skill` is currently evolving toward a dual-entry model:

- **Web** for packaging and downloading Skills
- **CLI** for installing, selecting, and chatting with Skills
