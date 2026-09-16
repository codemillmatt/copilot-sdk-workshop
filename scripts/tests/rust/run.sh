#!/usr/bin/env bash
set -euo pipefail
cargo --version
root="$(cd "$(dirname "$0")/../../.." && pwd)"
temp="$(mktemp -d "${TMPDIR:-/tmp}/workshop-rust-tests.XXXXXXXX")"
trap 'rm -rf -- "$temp"' EXIT
cmp "$root/start-museum/rust/src/lib.rs" "$root/finished/rust/museum-exhibit-studio/src/lib.rs"
cmp "$root/start-accessibility/rust/src/artifact.rs" "$root/finished/rust/accessibility-report/src/artifact.rs"
add_tests() {
    printf '\n#[cfg(test)]\nmod maintainer_%s { include!(r#"%s/scripts/tests/rust/%s.rs"#); }\n' "$2" "$root" "$2" >> "$1"
}
for source in start-accessibility/rust start-museum/rust finished/rust/hello-copilot-sdk finished/rust/accessibility-report finished/rust/museum-exhibit-studio; do
    project="$temp/$source"
    mkdir -p "$project"
    cp "$root/$source/Cargo.toml" "$root/$source/Cargo.lock" "$project/"
    cp -R "$root/$source/src" "$project/src"
    if [ "$source" = start-accessibility/rust ]; then
        # Early lessons replace the entrypoint; supplied artifact helpers must survive.
        printf 'fn main() {}\n' > "$project/src/main.rs"
    fi
    add_tests "$project/src/main.rs" sdk_tests
    case "$source" in
        start-museum/*|*museum-exhibit-studio)
            add_tests "$project/src/lib.rs" artifact_tests
            add_tests "$project/src/lib.rs" museum_tests
            add_tests "$project/src/lib.rs" sdk_tests ;;
        *hello-copilot-sdk) ;;
        *)
            printf '\n#[cfg(test)]\nmod artifact;\n' >> "$project/src/main.rs"
            add_tests "$project/src/artifact.rs" artifact_tests ;;
    esac
    case "$source" in
        *museum-exhibit-studio) add_tests "$project/src/main.rs" generation_tests ;;
        *accessibility-report) add_tests "$project/src/main.rs" accessibility_tests ;;
    esac
    printf '\nTesting %s\n' "$source"
    cargo test --locked --quiet --manifest-path "$project/Cargo.toml" --target-dir "$project/target"
done
