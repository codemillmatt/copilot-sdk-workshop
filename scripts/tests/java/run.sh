#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../../.." && pwd)"
case "${1:-starter}" in
  starter)
    accessibility="$root/start-accessibility/java"
    museum="$root/start-museum/java"
    ;;
  finished)
    accessibility="$root/finished/java/accessibility-report"
    museum="$root/finished/java/museum-exhibit-studio"
    ;;
  *) printf 'Usage: bash scripts/tests/java/run.sh [starter|finished]\n' >&2; exit 1 ;;
esac

mvn -q -f "$accessibility/pom.xml" compile dependency:build-classpath \
  -Dmdep.outputFile=target/workshop-check-classpath.txt
mvn -q -f "$museum/pom.xml" compile
classpath="$(cat "$accessibility/target/workshop-check-classpath.txt")"
classpath="$accessibility/target/classes:$museum/target/classes:$classpath"
output="$root/scripts/tests/java/target"
mkdir -p "$output"
javac -Acopilot.experimental.allowed=true -cp "$classpath" -d "$output" \
  "$root/scripts/tests/java/WorkshopChecks.java"
java -cp "$output:$classpath" com.github.copilot.WorkshopChecks
