#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

COMMAND="${1:-make}"
JSON_OUTPUT=false
EXPECT_OUTPUT_DIR=false
OUTPUT_DIR="$ROOT_DIR/example-output"

if [ "$#" -gt 0 ]; then
  shift
fi

for arg in "$@"; do
  if [ "$EXPECT_OUTPUT_DIR" = "true" ]; then
    OUTPUT_DIR="$arg"
    EXPECT_OUTPUT_DIR=false
    continue
  fi

  case "$arg" in
    --json)
      if [ "$COMMAND" = "status" ]; then
        JSON_OUTPUT=true
      fi
      ;;
    --output-dir)
      EXPECT_OUTPUT_DIR=true
      ;;
    *)
      if [ -n "$arg" ]; then
        OUTPUT_DIR="$arg"
      fi
      ;;
  esac
done

if [ "$EXPECT_OUTPUT_DIR" = "true" ]; then
  printf 'Missing value for --output-dir\n' >&2
  exit 1
fi

SPEC_PATH="$OUTPUT_DIR/distilled-spec.json"
SKILL_DIR="$OUTPUT_DIR/generated-skill"

run_make() {
  mkdir -p "$OUTPUT_DIR"
  rm -rf "$SKILL_DIR"

  node "$ROOT_DIR/src/cli.js" distill "$ROOT_DIR/distill-input.example.json" --output "$SPEC_PATH"
  node "$ROOT_DIR/src/cli.js" from-spec "$SPEC_PATH" "$SKILL_DIR"
  node "$ROOT_DIR/src/cli.js" publish "$SKILL_DIR"

  printf 'Example artifacts created:\n'
  printf 'spec=%s\n' "$SPEC_PATH"
  printf 'skill_dir=%s\n' "$SKILL_DIR"
  printf 'archive_dir=%s\n' "$SKILL_DIR/dist"
}

run_clean() {
  rm -rf "$OUTPUT_DIR"
  printf 'Cleaned example output: %s\n' "$OUTPUT_DIR"
}

run_status() {
  directory=missing
  distilled_spec=missing
  skill_dir=missing
  archive_count=0

  if [ -d "$OUTPUT_DIR" ]; then
    directory=present
  fi

  if [ -f "$SPEC_PATH" ]; then
    distilled_spec=present
  fi

  if [ -d "$SKILL_DIR" ]; then
    skill_dir=present
  fi

  if [ -d "$SKILL_DIR/dist" ]; then
    archive_count=$(find "$SKILL_DIR/dist" -maxdepth 1 -type f -name '*.tar.gz' | wc -l | tr -d ' ')
  fi

  if [ "$JSON_OUTPUT" = "true" ]; then
    OUTPUT_DIR="$OUTPUT_DIR" \
    DIRECTORY_STATUS="$directory" \
    DISTILLED_SPEC_STATUS="$distilled_spec" \
    SKILL_DIR_STATUS="$skill_dir" \
    ARCHIVE_COUNT="$archive_count" \
      node -e 'console.log(JSON.stringify({output_dir: process.env.OUTPUT_DIR, directory: process.env.DIRECTORY_STATUS, distilled_spec: process.env.DISTILLED_SPEC_STATUS, skill_dir: process.env.SKILL_DIR_STATUS, archive_count: Number(process.env.ARCHIVE_COUNT)}))'
    return
  fi

  printf 'output_dir=%s\n' "$OUTPUT_DIR"
  printf 'directory=%s\n' "$directory"
  printf 'distilled_spec=%s\n' "$distilled_spec"
  printf 'skill_dir=%s\n' "$skill_dir"
  printf 'archive_count=%s\n' "$archive_count"
}

case "$COMMAND" in
  make)
    run_make
    ;;
  clean)
    run_clean
    ;;
  reset)
    run_clean
    run_make
    ;;
  status)
    run_status
    ;;
  *)
    printf 'Usage: sh ./scripts/demo.sh [make|clean|reset|status] [--output-dir <dir>|output-dir] [--json]\n' >&2
    exit 1
    ;;
esac
