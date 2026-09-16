#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { getLanguage, languages } = require('../docs/language-registry.js');
const { preprocessLanguageDirectives } = require('../docs/markdown-language-preprocessor.js');

const root = path.resolve(__dirname, '..');
const selected = process.argv[2];
if (!getLanguage(selected)) {
    console.error(`Usage: node scripts/replay-workshop.js <${languages.map(item => item.id).join('|')}>`);
    process.exit(2);
}

function run(command, args, cwd) {
    const result = spawnSync(command, args, { cwd, encoding: 'utf8', shell: false });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(`${command} ${args.join(' ')} failed:\n${result.stdout}${result.stderr}`);
    }
}

function projectFile(project, name) {
    const file = path.resolve(project, name);
    if (!file.startsWith(project + path.sep)) throw new Error(`Out-of-project file: ${name}`);
    return file;
}

function codeBlocks(lesson) {
    const file = path.resolve(root, 'workshop', lesson);
    const markdown = preprocessLanguageDirectives(fs.readFileSync(file, 'utf8'), selected, getLanguage);
    const blocks = new Map();
    const pattern = /<!-- code-id: ([a-z0-9-]+) -->\s*\n```[^\n]*\n([\s\S]*?)\n```/g;
    for (const match of markdown.matchAll(pattern)) {
        if (blocks.has(match[1])) throw new Error(`Duplicate code id: ${match[1]}`);
        blocks.set(match[1], match[2]);
    }
    return blocks;
}

function locate(text, anchor, occurrence) {
    const first = text.indexOf(anchor);
    if (first < 0) throw new Error(`Missing edit anchor: ${anchor}`);
    const last = text.lastIndexOf(anchor);
    if (occurrence === 'last') return last;
    if (occurrence === 'first') return first;
    if (first !== last) throw new Error(`Ambiguous edit anchor: ${anchor}`);
    return first;
}

function braceEnd(text, start) {
    let depth = 0;
    let quote = '';
    for (let i = start; i < text.length; i++) {
        if (quote) {
            if (text.startsWith(quote, i)) { i += quote.length - 1; quote = ''; }
            else if (text[i] === '\\' && quote !== '`' && quote !== '"""') i++;
            continue;
        }
        if (text.startsWith('//', i)) { i = text.indexOf('\n', i); if (i < 0) break; continue; }
        if (text.startsWith('/*', i)) {
            i = text.indexOf('*/', i + 2);
            if (i < 0) throw new Error('Unclosed block comment');
            i++;
            continue;
        }
        if (text.startsWith('"""', i)) { quote = '"""'; i += 2; continue; }
        if (text[i] === '"' || text[i] === '`' || (text[i] === "'" && text[i + 2] === "'")) {
            quote = text[i];
            continue;
        }
        if (text[i] === '{') depth++;
        if (text[i] === '}' && --depth === 0) return i + 1;
    }
    throw new Error('Could not locate the end of the declaration');
}

function declarationRange(text, operation, project) {
    if (selected === 'nodejs') {
        const ts = createRequire(path.join(project, 'package.json'))('typescript');
        const source = ts.createSourceFile(operation.file, text, ts.ScriptTarget.Latest, true);
        const matches = source.statements.filter(statement =>
            operation.op === 'replace-import'
                ? ts.isImportDeclaration(statement) && statement.moduleSpecifier.text === operation.name
                : ts.isFunctionDeclaration(statement) && statement.name?.text === operation.name);
        if (matches.length !== 1) throw new Error(`Expected one declaration: ${operation.name}`);
        return [matches[0].getStart(source), matches[0].end];
    }
    const start = locate(text, operation.anchor, operation.occurrence);
    if (selected === 'python') {
        const name = operation.anchor.match(/def\s+(\w+)/)?.[1];
        if (!name) throw new Error(`Missing Python declaration name: ${operation.anchor}`);
        const result = spawnSync(process.env.WORKSHOP_PYTHON || 'python3', ['-c', `
import ast, json, sys
data = json.load(sys.stdin)
text = data["text"]
matches = [node for node in ast.parse(text).body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == data["name"]]
if len(matches) != 1: raise ValueError("Expected one Python declaration: " + data["name"])
node = matches[0]
lines = text.splitlines(keepends=True)
print(json.dumps([len("".join(lines[:node.lineno-1])) + node.col_offset, len("".join(lines[:node.end_lineno-1])) + node.end_col_offset]))
`], { input: JSON.stringify({ text, name }), encoding: 'utf8' });
        if (result.error) throw result.error;
        if (result.status !== 0) throw new Error(result.stderr);
        return JSON.parse(result.stdout);
    }
    const brace = text.indexOf('{', start);
    if (brace < 0) throw new Error(`Missing declaration body: ${operation.anchor}`);
    return [start, braceEnd(text, brace)];
}

function applyOperation(project, operation, blocks) {
    const file = projectFile(project, operation.file);
    let code = operation.block ? blocks.get(operation.block) : operation.text;
    if (code === undefined) throw new Error(`Missing replacement code: ${operation.block}`);
    if (operation.indent) code = code.split('\n').map(line => line ? ' '.repeat(operation.indent) + line : line).join('\n');
    let text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    if (operation.op === 'write') text = code + '\n';
    else if (operation.op === 'append') text += '\n' + code + '\n';
    else if (operation.op === 'prepend') text = code + '\n' + text;
    else if (operation.op === 'replace-config' && selected === 'nodejs') {
        const ts = createRequire(path.join(project, 'package.json'))('typescript');
        const fragment = ts.createSourceFile('config.ts', 'const value = {\n' + code + '\n};', ts.ScriptTarget.Latest, true);
        const properties = fragment.statements[0].declarationList.declarations[0].initializer.properties;
        for (const property of properties) {
            const source = ts.createSourceFile(operation.file, text, ts.ScriptTarget.Latest, true);
            const matches = [];
            function visit(node) {
                if (ts.isPropertyAssignment(node) && node.name.getText(source) === property.name.getText(fragment)) matches.push(node);
                ts.forEachChild(node, visit);
            }
            visit(source);
            if (matches.length !== 1) throw new Error(`Expected one config property: ${property.name.getText(fragment)}`);
            const old = matches[0];
            text = text.slice(0, old.getStart(source)) + property.getText(fragment) + text.slice(old.end);
        }
    } else if (operation.op === 'replace-config' && selected === 'python') {
        const result = spawnSync(process.env.WORKSHOP_PYTHON || 'python3', ['-c', `
import ast, json, sys
data = json.load(sys.stdin)
text, fragment = data["text"], "f(\\n" + data["code"] + "\\n)"
parsed = ast.parse(text)
offsets = [0]
for line in text.splitlines(keepends=True): offsets.append(offsets[-1] + len(line))
edits = []
for replacement in ast.parse(fragment).body[0].value.keywords:
    matches = [node for node in ast.walk(parsed) if isinstance(node, ast.keyword) and node.arg == replacement.arg]
    if len(matches) != 1: raise ValueError("Expected one config keyword: " + replacement.arg)
    node = matches[0]
    edits.append((offsets[node.lineno-1] + node.col_offset, offsets[node.end_lineno-1] + node.end_col_offset, ast.get_source_segment(fragment, replacement)))
for start, end, replacement in sorted(edits, reverse=True): text = text[:start] + replacement + text[end:]
print(json.dumps(text))
`], { input: JSON.stringify({ text, code }), encoding: 'utf8' });
        if (result.error) throw result.error;
        if (result.status !== 0) throw new Error(result.stderr);
        text = JSON.parse(result.stdout);
    } else if (operation.op === 'replace-function' || operation.op === 'replace-import') {
        const [start, end] = declarationRange(text, operation, project);
        text = text.slice(0, start) + code + '\n' + text.slice(end);
    } else {
        const start = locate(text, operation.anchor, operation.occurrence);
        if (operation.op === 'before') text = text.slice(0, start) + code + '\n' + text.slice(start);
        else if (operation.op === 'after') {
            const end = start + operation.anchor.length;
            text = text.slice(0, end) + '\n' + code + '\n' + text.slice(end);
        } else if (operation.op === 'replace') {
            text = text.slice(0, start) + code + text.slice(start + operation.anchor.length);
        } else if (operation.op === 'replace-braced') {
            const brace = text.indexOf('{', start);
            if (brace < 0) throw new Error('Missing block opening brace');
            text = text.slice(0, start) + code + text.slice(braceEnd(text, brace));
        } else if (operation.op === 'replace-tail') text = text.slice(0, start) + code + '\n';
        else if (operation.op === 'replace-region') {
            const end = locate(text, operation.end, operation.endOccurrence) + operation.end.length;
            if (end < start) throw new Error('Reversed replacement range');
            text = text.slice(0, start) + code + text.slice(end);
        } else throw new Error(`Unknown edit operation: ${operation.op}`);
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
}

function prepare(project, original) {
    if (selected === 'nodejs') {
        const installed = path.join(original, 'node_modules');
        if (fs.existsSync(installed)) {
            fs.symlinkSync(installed, path.join(project, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
        } else {
            run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci', '--ignore-scripts', '--no-audit', '--fund=false'], project);
        }
    }
}

function check(project) {
    if (selected === 'nodejs') {
        run(process.execPath, [path.join(project, 'node_modules/typescript/bin/tsc'), '--noEmit'], project);
    } else if (selected === 'python') {
        run(process.env.WORKSHOP_PYTHON || 'python3', ['-c',
            'import ast, importlib, pathlib; files=list(pathlib.Path(".").glob("*.py")); [ast.parse(p.read_text(), filename=str(p)) for p in files]; [importlib.import_module(p.stem) for p in files]'], project);
    } else if (selected === 'dotnet') run('dotnet', ['build', '--nologo', '--verbosity', 'quiet'], project);
    else if (selected === 'go') run('go', ['build', '-mod=readonly', './...'], project);
    else if (selected === 'rust') run('cargo', ['check', '--locked', '--quiet', '--target-dir', path.join(project, 'target')], project);
    else if (selected === 'java') run('mvn', ['--batch-mode', '--no-transfer-progress', 'compile'], project);
}

function checkInitialPolicy(project, lesson) {
    if (!/^(?:0[12]-|museum-0[123]-)/.test(lesson)) return;
    const entries = {
        dotnet: 'Program.cs', nodejs: 'src/index.ts', python: 'main.py',
        go: 'main.go', rust: 'src/main.rs',
        java: `src/main/java/workshop/${lesson.startsWith('museum-') ? 'MuseumExhibitStudio' : 'AccessibilityReport'}.java`
    };
    const source = fs.readFileSync(projectFile(project, entries[selected]), 'utf8');
    const emptyLists = {
        dotnet: /AvailableTools\s*=\s*(?:\[\s*\]|Array\.Empty<string>\(\))/,
        nodejs: /availableTools\s*:\s*\[\s*\]/,
        python: /available_tools\s*=\s*\[\s*\]/,
        go: /AvailableTools\s*:\s*\[\]string\s*\{\s*\}/,
        rust: /available_tools\s*=\s*Some\((?:vec!\[\s*\]|Vec::new\(\))\)/,
        java: /setAvailableTools\((?:List\.of\(\)|java\.util\.List\.of\(\)|Collections\.emptyList\(\))\)/
    };
    if (!emptyLists[selected].test(source)) throw new Error('The initial checkpoint must explicitly disable tools.');
    if (!/deny|reject/i.test(source) || /approve_?all/i.test(source)) {
        throw new Error('The initial checkpoint must reject unexpected permissions, not approve all.');
    }
}

const recipePath = path.join(__dirname, 'checkpoints', selected + '.json');
const recipes = JSON.parse(fs.readFileSync(recipePath, 'utf8'));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), `copilot-lessons-${selected}-`));
const ignored = new Set(['node_modules', '.venv', '__pycache__', 'bin', 'obj', 'target', 'dist', '.playwright-mcp']);
let count = 0;
try {
    fs.copyFileSync(path.join(root, 'Directory.Build.props'), path.join(temporary, 'Directory.Build.props'));
    for (const [track, steps] of Object.entries(recipes)) {
        const original = path.join(root, track.startsWith('museum') ? 'start-museum' : 'start-accessibility', selected);
        const project = path.join(temporary, track);
        fs.cpSync(original, project, { recursive: true, filter: file => !ignored.has(path.basename(file)) });
        prepare(project, original);
        for (const step of steps) {
            const blocks = codeBlocks(step.lesson);
            try {
                for (const operation of step.operations) applyOperation(project, operation, blocks);
                checkInitialPolicy(project, step.lesson);
                check(project);
                count++;
                console.log(`Checkpoint passed: ${selected}/${track}/${step.lesson}`);
            } catch (error) {
                throw new Error(`${selected}/${track}/${step.lesson}: ${error.message}`, { cause: error });
            }
        }
    }
    console.log(`Replayed ${count} ${selected} checkpoints without running Copilot.`);
} finally {
    fs.rmSync(temporary, { recursive: true });
}
