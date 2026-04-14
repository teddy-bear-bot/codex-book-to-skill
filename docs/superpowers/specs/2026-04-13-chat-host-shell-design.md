# Book-to-Skill Chat Host Shell Design

## Background

`Book-to-Skill` already supports:

- turning structured inputs into a `Skill Spec`
- generating a portable Skill package directory from a spec
- packing that directory into a distributable `.tar.gz`
- installing packaged Skills into a local store
- listing and uninstalling installed Skills
- packaging new Skills through the local Web MVP

What it does **not** support yet is the final user-facing runtime layer: a host shell where users can install Skills, browse installed Skills, select one, and stay in a persistent chat session with that Skill.

This design adds that missing layer.

## Goal

Add a `chat` host shell so users can:

1. start a persistent CLI host with `book-to-skill chat`
2. optionally install a local or remote `.tar.gz` while entering the host
3. manually choose an installed Skill with `/skill`
4. enter a persistent chat session for the chosen Skill
5. switch Skills without leaving the host

## Non-Goals

This phase does **not** attempt to:

- build a remote multi-user service
- add full-screen TUI navigation frameworks
- add model-provider integrations beyond a minimal local invocation path
- auto-enter the most recently installed Skill
- add automatic update checks
- add session persistence across separate CLI launches

## Product Model

The runtime is split into two layers:

### 1. Host shell

The host shell is the top-level CLI environment.

Responsibilities:

- install incoming Skill packages
- show current host status
- list and select installed Skills
- switch between Skills
- exit cleanly

### 2. Skill session

A Skill session begins only after the user selects a Skill from the host.

Responsibilities:

- accept normal user text as chat input
- expose Skill-specific helper commands
- maintain session-local context
- allow reset or switching back to another Skill

This separation is intentional. The host manages many Skills; the Skill session runs one Skill at a time.

## Entry Points

The primary runtime entrypoint is:

```bash
book-to-skill chat [source-or-skill-id] [--global]
```

Supported inputs:

- no argument → enter host directly
- installed Skill ID → enter host with that Skill as the suggested current selection target
- local `.tar.gz` → install first, then enter host
- remote `.tar.gz` URL → download, install, then enter host

## Install Behavior

### Default install

When a user passes a local or remote `.tar.gz`:

- install to the user store by default
- enter the host shell afterward
- do **not** auto-open the installed Skill session

Default user store:

```text
~/.book-to-skill/skills
```

### Global install

When `--global` is passed:

- install into the global Skill store
- then enter the host shell

This design keeps installation simple while preserving the host-first workflow.

## Why the host does not auto-enter the newly installed Skill

Even if the user launches:

```bash
book-to-skill chat ./my-skill.tar.gz
```

the runtime should not automatically jump into that Skill.

Reason:

- users may have multiple installed Skills
- the host is a stable container for browsing and switching
- `/skill` becomes the single, predictable selection mechanism

This keeps the workflow consistent:

1. install if needed
2. enter host
3. choose active Skill manually

## Host Shell UX

### Default start state

If the user launches `book-to-skill chat` with no current Skill selected, the host shows:

- host title
- current status
- current store
- the fact that no Skill is selected
- the next action: `/skill`

### Welcome screen style

The host welcome screen should use:

- ANSI-colored terminal output
- a pixel-ancient / Chinese-inspired frame language
- short English copy
- visually distinct host title and command hints

The style is intentionally decorative, but still terminal-native and implementation-friendly.

## Host Commands

The host shell supports:

- `/skill` — list or find installed Skills and choose one
- `/help` — show host help
- `/info` — show current host status
- `/exit` — exit the whole program
- `/quit` — exit the whole program

If no Skill is currently selected and the user types normal free text, the host should not guess intent. It should respond with a short reminder:

```text
No skill selected. Use /skill to choose one.
```

## `/skill` flow

The `/skill` command is the central selector.

Expected behavior:

- show installed Skills in a simple numbered list
- allow selection by number
- allow selection by exact Skill ID
- optionally allow filtering later, but that is not required in the first version

After a valid selection:

- mark the chosen Skill as active
- print a short activation message
- move into that Skill’s persistent session mode

## Skill Session UX

Once a Skill is selected, the shell enters Skill session mode.

Expected behavior:

- ordinary input lines are treated as user requests for the active Skill
- the active Skill stays selected until the user resets, switches, or exits

## Skill Session Commands

The Skill session supports:

- `/help` — show current Skill usage
- `/inputs` — show Skill-supported input fields
- `/reset` — clear the current session context
- `/info` — show active Skill info
- `/skill` — leave the current Skill session and choose another Skill
- `/exit` — exit the program
- `/quit` — exit the program

## Invocation Model

The first version should keep invocation minimal and host-controlled.

At runtime, the host will:

1. resolve the active installed Skill
2. read its `skill.json`
3. read its `system.md`
4. read its `inputs.schema.json` if present
5. build a local invocation payload
6. pass user messages into the selected Skill session

The exact provider/backend can remain conservative in this phase. The key requirement is that the host/session boundary and command behavior are correct.

## Error Handling

### Package install failures

If a local or remote package cannot be installed:

- print a clear installation error
- do not enter the Skill session
- either stop immediately or fall back to host entry only if install partially succeeded cleanly

### Empty registry

If `/skill` is used but no Skills are installed:

- show a short empty-state message
- remind the user to install a `.tar.gz`

### Invalid selection

If the user enters an unknown number or Skill ID:

- keep them in the host shell
- show a short retry message

### Skill runtime failures

If the active Skill cannot load required files:

- show a clear runtime error
- keep the shell alive
- allow `/skill` to switch to another Skill

## Implementation Shape

The first version should prefer small modules over putting everything into `src/cli.js`.

Suggested decomposition:

- a `chat` command parser entry in `src/cli.js`
- a host-shell module for shell loop and command handling
- a skill-selector module for `/skill`
- a session-state module for active Skill + chat context
- an invocation module for reading installed Skill files and dispatching user messages
- optional terminal-formatting helpers for the ANSI welcome screen

## Testing Strategy

The implementation should follow TDD and cover:

### CLI entry

- `chat` command parsing
- local package install + host entry
- URL package install + host entry
- `--global` mode selection

### Host shell behavior

- host starts with no active Skill
- unrecognized free text before selection prompts `/skill`
- `/help`, `/info`, `/exit`, `/quit` work

### Skill selection

- `/skill` lists installed Skills
- selecting by number works
- selecting by Skill ID works
- invalid selections keep the shell alive

### Skill session

- selected Skill becomes active
- `/reset` clears session context
- `/skill` returns to selection flow
- `/inputs` and `/info` surface Skill metadata

## Rollout Order

Recommended implementation order:

1. add `chat` CLI entry and host shell skeleton
2. support local `.tar.gz` install before host entry
3. implement `/skill` selection against installed registry
4. add active Skill session state
5. add basic Skill invocation flow
6. add ANSI welcome screen styling
7. add remote `.tar.gz` support
8. update README and user guide

## Decision Summary

- runtime form: host shell + Skill session
- entry command: `book-to-skill chat`
- package sources: installed ID, local `.tar.gz`, remote `.tar.gz`
- local install default: yes
- global install option: `--global`
- auto-enter installed Skill: no
- Skill activation mechanism: `/skill`
- visual style: ANSI-colored terminal host with restrained Chinese-inspired frame elements
