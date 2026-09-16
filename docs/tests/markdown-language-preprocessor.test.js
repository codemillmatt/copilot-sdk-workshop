'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { getLanguage } = require('../language-registry.js');
const {
    firstLessonUrl,
    homeUrl,
    lessonUrl,
    resolveLanguage
} = require('../language-navigation.js');
const { preprocessLanguageDirectives } = require('../markdown-language-preprocessor.js');

const preprocess = (markdown, languageId) =>
    preprocessLanguageDirectives(markdown, languageId, getLanguage);

assert.equal(
    preprocess('Shared\n:::language dotnet\n.NET only\n:::\n:::language python\nPython only\n:::\nEnd', 'dotnet'),
    'Shared\n.NET only\nEnd'
);
assert.equal(
    preprocess('Shared\n:::language dotnet\n.NET only\n:::\n:::language python\nPython only\n:::\nEnd', 'python'),
    'Shared\nPython only\nEnd'
);
assert.throws(
    () => preprocess(':::language dotnet\n:::language python\n:::\n:::', 'dotnet'),
    /cannot be nested/
);
assert.throws(() => preprocess(':::language unknown\n:::', 'dotnet'), /unknown language/);
assert.throws(() => preprocess(':::language dotnet\nUnclosed', 'dotnet'), /not closed/);
assert.throws(() => preprocess(':::', 'dotnet'), /closing directive has no open/);
assert.throws(() => preprocess(':::unexpected', 'dotnet'), /expected :::language/);

assert.equal(lessonUrl('04-mcp-safety', 'rust'), '?step=04-mcp-safety&lang=rust');
assert.equal(lessonUrl('04-mcp-safety'), '?step=04-mcp-safety');
assert.equal(firstLessonUrl('java'), 'workshop/step.html?step=00-preflight&lang=java');
assert.equal(firstLessonUrl('python', 'museum'), 'workshop/step.html?step=museum-00-preflight&lang=python');
assert.equal(homeUrl('python'), '../index.html?lang=python');
assert.equal(homeUrl('python', 'museum'), '../index.html?lang=python&workshop=museum');
assert.equal(homeUrl(), '../index.html');
assert.equal(resolveLanguage('?lang=go', 'rust', getLanguage).id, 'go');
assert.equal(resolveLanguage('', 'rust', getLanguage).id, 'rust');
assert.equal(resolveLanguage('?lang=unknown', 'rust', getLanguage), null);

const home = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const learningPosition = home.indexOf('id="outcomes-title"');
const purposePosition = home.indexOf('id="purpose-title"');
const chooserPosition = home.indexOf('id="workshop-picker"');
const startPosition = home.indexOf('id="startWorkshopLink"');
assert.ok(learningPosition > 0 && chooserPosition > learningPosition);
assert.ok(startPosition > chooserPosition && purposePosition > startPosition);
assert.ok(startPosition > home.indexOf('id="workshopPreview"'));
assert.ok(home.indexOf('</main>') > startPosition);
assert.equal((home.match(/class="section-divider"/g) ?? []).length, 2);
assert.ok(home.indexOf('class="section-divider"') > home.indexOf('id="outcomes-title"'));
assert.ok(home.lastIndexOf('class="section-divider"') > startPosition);
assert.ok(home.lastIndexOf('class="section-divider"') < purposePosition);
assert.match(home, /software development life cycle \(SDLC\)/);
assert.match(home, /Build an AI agent with the GitHub Copilot SDK/);
assert.doesNotMatch(home, /id="installCommand"/);
assert.ok(home.includes('src="assets/workshop-hero.svg"'));
assert.ok(fs.existsSync(path.join(__dirname, '../assets/workshop-hero.svg')));
assert.match(home, /components, not complete agents by themselves/);
assert.doesNotMatch(home, /use Copilot from|Copilot's agent runtime/);

const viewer = fs.readFileSync(path.join(__dirname, '../workshop/step.html'), 'utf8');
assert.ok(viewer.includes(".replaceAll('{{ASSET_BASE_URL}}', assetBaseUrl)"));
const museumLessons = fs.readdirSync(path.join(__dirname, '../../workshop'))
    .filter(name => name.startsWith('museum-') && name.endsWith('.md'));
let diagrams = 0;
for (const lesson of museumLessons) {
    const markdown = fs.readFileSync(path.join(__dirname, '../../workshop', lesson), 'utf8');
    for (const match of markdown.matchAll(/<img\s+src="\{\{ASSET_BASE_URL\}\}([^"]+)"[^>]*alt="([^"]+)"/g)) {
        diagrams++;
        assert.ok(match[2].trim().length > 0);
        assert.ok(fs.existsSync(path.join(__dirname, '../assets', match[1])));
        for (const language of ['dotnet', 'go', 'java', 'nodejs', 'python', 'rust']) {
            assert.ok(preprocess(markdown, language).includes(match[0]));
        }
    }
}
assert.equal(diagrams, 3);
const firstMuseumLesson = fs.readFileSync(
    path.join(__dirname, '../../workshop/museum-01-first-curator-session.md'), 'utf8');
for (const language of ['dotnet', 'go', 'java', 'nodejs', 'python', 'rust']) {
    const rendered = preprocess(firstMuseumLesson, language);
    assert.match(rendered, /curator agent/);
    assert.match(rendered, /not an extra process or a single SDK object/);
    assert.match(rendered, /Copilot CLI harness/);
}

const instructorHtml = fs.readFileSync(path.join(__dirname, '../instructor/index.html'), 'utf8');
const instructorScript = fs.readFileSync(path.join(__dirname, '../instructor/instructor.js'), 'utf8');
assert.ok(!home.includes('href="instructor/"'));
assert.ok(instructorHtml.includes('href="museum-instructor.pptx"'));
assert.ok(instructorHtml.includes('id="instructorLanguage"'));
assert.ok(instructorScript.includes("../../instructor/museum/"));
assert.ok(instructorScript.includes("new URL('content/', location.href)"));
assert.ok(instructorScript.includes('Unknown instructor chapter.'));

console.log('Workshop language directive and navigation tests passed.');
