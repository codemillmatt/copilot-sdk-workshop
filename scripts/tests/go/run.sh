#!/usr/bin/env bash
set -euo pipefail
go version
root="$(cd "$(dirname "$0")/../../.." && pwd)"
temp="$(mktemp -d "${TMPDIR:-/tmp}/workshop-go-tests.XXXXXXXX")"
trap 'rm -rf -- "$temp"' EXIT
export GOCACHE="${GOCACHE:-$temp/cache}"
cmp "$root/start-museum/go/curator.go" "$root/finished/go/museum-exhibit-studio/curator.go"
cmp "$root/start-accessibility/go/artifact.go" "$root/finished/go/accessibility-report/artifact.go"
for source in start-accessibility/go start-museum/go finished/go/hello-copilot-sdk finished/go/accessibility-report finished/go/museum-exhibit-studio; do
    project="$temp/$source"
    mkdir -p "$project"
    cp "$root/$source/"*.go "$root/$source/go.mod" "$root/$source/go.sum" "$project/"
    if [ "$source" = start-accessibility/go ]; then
        # Early lessons replace the entrypoint; supplied artifact helpers must survive.
        printf 'package main\n\nfunc main() {}\n' > "$project/main.go"
    fi
    cp "$root/scripts/tests/go/sdk_test.go" "$project/"
    case "$source" in
        *hello-copilot-sdk) ;;
        *) cp "$root/scripts/tests/go/artifact_test.go" "$project/" ;;
    esac
    case "$source" in
        start-museum/*|*museum-exhibit-studio)
            cp "$root/scripts/tests/go/museum_test.go" "$project/" ;;
        *accessibility-report)
            cp "$root/scripts/tests/go/accessibility_test.go" "$project/" ;;
    esac
    if [ "$source" = finished/go/museum-exhibit-studio ]; then
        cp "$root/scripts/tests/go/generation_test.go" "$project/"
    fi
    printf '\nTesting %s\n' "$source"
    (cd "$project" && go test -mod=readonly -count=1 -timeout=45s ./...)
done
