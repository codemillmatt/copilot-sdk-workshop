'use strict';

const fs = require('node:fs');
const path = require('node:path');
const PptxGenJS = require('pptxgenjs');
const JSZip = require('jszip');

const deck = new PptxGenJS();
deck.layout = 'LAYOUT_WIDE';
deck.author = 'Copilot SDK Workshop';
deck.subject = 'Museum Exhibit Studio: opening and major teaching transitions';
deck.title = 'Build a curator. Keep the judgment human.';
deck.company = 'Copilot SDK Workshop';
deck.lang = 'en-US';
deck.theme = { headFontFace: 'Georgia', bodyFontFace: 'Trebuchet MS', lang: 'en-US' };

const C = {
  ink: '202C2B',
  paper: 'F4F0E7',
  white: 'FFFFFF',
  sage: 'D9E3D4',
  green: '31594D',
  copper: 'AD4D36',
  blush: 'EBCABD',
  muted: '55635E',
  light: 'CDD8D1',
  rule: 'CBD1C8',
};
const W = 13.333333;
const H = 7.5;
const S = deck.ShapeType;
const diagramBounds = [];
let slideNumber = 0;

function shape(slide, type, x, y, w, h, fill, options = {}) {
  diagramBounds.push({ slide: slideNumber, type, x, y, w, h });
  slide.addShape(type, {
    x, y, w, h,
    fill: { color: fill },
    line: { color: fill, transparency: 100 },
    ...options,
  });
}

function text(slide, value, x, y, w, h, size = 22, color = C.ink, options = {}) {
  diagramBounds.push({ slide: slideNumber, type: 'text', x, y, w, h });
  slide.addText(value, {
    x, y, w, h, fontFace: 'Trebuchet MS', fontSize: size, color,
    margin: 0, breakLine: false, valign: 'mid', paraSpaceAfterPt: 0,
    ...options,
  });
}

function title(slide, value, dark = false, width = 11.8) {
  text(slide, value, 0.68, 0.92, width, 1.38, 39, dark ? C.paper : C.ink,
    { fontFace: 'Georgia', bold: true, valign: 'top' });
}

function label(slide, value, x, y, w, dark = false) {
  text(slide, value, x, y, w, 0.28, 11, dark ? C.light : C.muted,
    { charSpacing: 1.9, bold: true });
}

function arrow(slide, x, y, w, h = 0, color = C.green, both = false) {
  slide.addShape(S.line, {
    x, y, w, h,
    line: { color, width: 2.5, beginArrowType: both ? 'triangle' : 'none', endArrowType: 'triangle' },
  });
}

function base(cue, dark = false) {
  const slide = deck.addSlide();
  slideNumber++;
  slide.background = { color: dark ? C.ink : C.paper };
  label(slide, 'MUSEUM EXHIBIT STUDIO', 0.68, 0.45, 7, dark);
  text(slide, 'GitHub Copilot SDK workshop', 0.68, 6.75, 5.4, 0.24, 10.5, dark ? C.light : C.muted);
  text(slide, `${String(slideNumber).padStart(2, '0')}  /  ${cue}`,
    7.35, 6.75, 5.3, 0.24, 10.5, dark ? C.light : C.muted, { align: 'right' });
  return slide;
}

function notes(slide, cue, duration, say, ask, release, limits, source) {
  slide.addNotes([
    `WHEN: ${cue}`,
    `TIME BOX: ${duration}. This is a suggested teaching allocation, not a measured workshop duration.`,
    '',
    'SAY / EXPLAIN',
    say,
    '',
    'ASK',
    ask,
    '',
    'RETURN TO HANDS-ON',
    release,
    '',
    'KEEP THE LIMITS CLEAR',
    limits,
    '',
    'INSTRUCTOR REFERENCE',
    source,
  ].join('\n'));
}

// 1. A museum-label composition introduces the task before the technology.
{
  const slide = base('OPENING', true);
  shape(slide, S.ellipse, 9.1, 0.80, 2.9, 2.9, C.green);
  shape(slide, S.ellipse, 10.95, 1.45, 1.45, 1.45, C.copper);
  text(slide, 'Build a curator.\nKeep the\njudgment human.',
    0.68, 1.30, 7.05, 3.1, 46, C.paper, { fontFace: 'Georgia', bold: true, valign: 'top' });
  text(slide, 'Approved facts in.\nAn exhibit draft to review.',
    0.73, 4.95, 6.0, 1.0, 25, C.light);

  shape(slide, S.rect, 8.0, 2.2, 4.6, 3.92, C.paper, {
    shadow: { type: 'outer', color: '000000', blur: 12, offset: 3, opacity: 0.18, angle: 90 },
  });
  label(slide, 'DRAFT / NOT APPROVED', 8.35, 2.52, 3.75);
  text(slide, 'A journey\nto the Moon', 8.35, 3.03, 3.8, 1.1, 31, C.ink,
    { fontFace: 'Georgia', bold: true });
  text(slide, 'A title.\nA short narrative.\nThree visitor questions.',
    8.35, 4.42, 3.8, 1.12, 20, C.muted, { breakLine: false });
  shape(slide, S.rect, 7.77, 6.18, 5.06, 0.24, C.green);
  notes(slide, 'Opening, after preflight', '45 seconds',
    'Imagine you build software for a museum education team. The educator selects approved facts and needs a draft for visitors. Our agent writes the language; the educator still reviews the claims. We call the agent a curator, but it does not replace professional judgment. The result is a console application, with research and a local HTML page as optional run choices.',
    'Which part of this job should remain a human decision?',
    'Do not demonstrate every feature yet. Move to the runtime diagram, then release participants to the first small request.',
    'The exhibit shown here is a visual mockup of the output structure, not a generated or verified historical exhibit. Non-SDLC means the agent is doing museum work rather than software-development work.',
    'instructor/museum/00-preflight.md; workshop/museum-00-preflight.md');
}

// 2. The architecture is drawn with native editable shapes.
{
  const slide = base('OPENING');
  title(slide, 'The CLI runs the loop.\nThe SDK makes it yours.');
  shape(slide, S.roundRect, 0.56, 2.35, 8.12, 2.82, C.paper,
    { line: { color: C.green, width: 1.1, dashType: 'dash' } });
  shape(slide, S.roundRect, 0.70, 2.68, 3.05, 1.78, C.white, { radius: 0.12 });
  text(slide, 'Your application', 0.94, 2.94, 2.55, 0.42, 25, C.ink, { bold: true });
  text(slide, 'SDK client + session', 0.94, 3.57, 2.55, 0.55, 20, C.muted);
  shape(slide, S.roundRect, 4.40, 2.48, 4.12, 2.18, C.green);
  text(slide, 'Copilot CLI', 4.75, 2.87, 3.42, 0.50, 30, C.white, { bold: true });
  text(slide, 'Conversation state\nModel calls + tool coordination',
    4.75, 3.54, 3.42, 0.78, 19, C.white);
  shape(slide, S.roundRect, 9.18, 2.68, 3.45, 1.78, C.blush);
  text(slide, 'Model service', 9.46, 2.94, 2.90, 0.42, 25, C.ink, { bold: true });
  text(slide, 'Text + tool requests', 9.46, 3.57, 2.90, 0.55, 20, C.ink);
  arrow(slide, 3.81, 3.56, 0.50, 0, C.green, true);
  arrow(slide, 8.58, 3.56, 0.50, 0, C.green, true);
  label(slide, 'ON YOUR MACHINE', 0.88, 4.76, 7.3);
  text(slide, 'In your code: client = connection, session = conversation.',
    0.88, 5.70, 11.7, 0.62, 24, C.green, { bold: true });
  notes(slide, 'Opening', '90 seconds',
    'The SDK is the programming interface. In the local architecture taught here, its client starts or connects to the Copilot CLI runtime. That runtime is the harness: it manages conversation state, model calls, tool coordination, and events. The model service generates text and can request a tool. It does not execute the application code. A session identifies one conversation; it is not a separate model. The arrows are request/response connections, not an instruction to automate typing into the CLI interface.',
    'If we create a second session, which part needs to change: the conversation or the model?',
    'Keep this vocabulary to client, session, runtime, and model. Avoid a tour of CLI commands or alternate hosting modes.',
    'The model service sits outside the local application boundary shown here. A user request can contain multiple model calls. Tool permissions are separate from authenticating to the model service. This diagram describes the workshop configuration, not every SDK deployment option.',
    'instructor/museum/01-first-session.md\nhttps://github.com/github/copilot-sdk/blob/v1.0.11/docs/features/agent-loop.md\nhttps://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli');
}

// 3. Three large actions replace a long agenda.
{
  const slide = base('START STEPS 1-3');
  title(slide, 'Connect. Ask. Inspect.');
  const cards = [
    { x: 0.72, n: '01', title: 'Create a session', body: 'Start with no tools.', color: C.green },
    { x: 4.93, n: '02', title: 'Send one prompt', body: 'Request two sentences.', color: C.copper },
    { x: 9.13, n: '03', title: 'Read the result', body: 'Then add streaming\nand a curator voice.', color: C.green },
  ];
  cards.forEach(card => {
    shape(slide, S.ellipse, card.x, 2.45, 1.06, 1.06, card.color);
    text(slide, card.n, card.x, 2.51, 1.06, 0.84, 28, C.white, { bold: true, align: 'center' });
    text(slide, card.title, card.x, 3.94, 3.48, 0.80, 27, C.ink, { bold: true });
    text(slide, card.body, card.x, 4.90, 3.48, 0.91, 21, C.muted, { valign: 'top' });
  });
  notes(slide, 'End of the opening', '60 seconds',
    'The first useful result is deliberately small. Create one tool-disabled session, send the Apollo 11 request, and inspect the response. Then use the supplied event consumer to stream text and add the curator system message. We are not building all capabilities at once.',
    'Point to the learner page and ask participants to find the file they will edit.',
    'Close or hide the deck now. Let participants work through Steps 1-3. Circulate rather than reading the code aloud line by line.',
    'The initial response is not verified museum content. Preserve the explicit empty tool list, rejection callback, and cleanup. The supplied helper files stay unchanged. Preflight should already be complete.',
    'instructor/museum/01-first-session.md\ninstructor/museum/02-streaming.md\ninstructor/museum/03-curator-voice.md');
}

// 4. A tool round trip emphasizes who executes code.
{
  const slide = base('BEFORE STEP 4');
  title(slide, 'The model requests.\nYour code executes.');
  const x = [0.72, 4.95, 9.18];
  const fills = [C.blush, C.green, C.white];
  const headings = ['Model request', 'Your function', 'Model draft'];
  const bodies = ['Model chooses a tool', 'approved_fact_lookup', 'Model uses the result'];
  x.forEach((left, i) => {
    shape(slide, S.roundRect, left, 2.75, 3.42, 1.75, fills[i]);
    text(slide, headings[i], left + 0.28, 3.01, 2.88, 0.50, 25, i === 1 ? C.white : C.ink, { bold: true });
    text(slide, bodies[i], left + 0.28, 3.73, 2.88, 0.46, i === 1 ? 17 : 19, i === 1 ? C.white : C.muted);
  });
  arrow(slide, 4.23, 3.63, 0.62);
  arrow(slide, 8.46, 3.63, 0.62);
  text(slide, 'Fixed data from code.\nVariable choices from the model.',
    0.75, 5.12, 11.85, 1.02, 28, C.green, { fontFace: 'Georgia', bold: true, align: 'center' });
  notes(slide, 'Major transition: first application-owned tool', '75 seconds',
    'The educator chooses the fact set before generation. The runtime tells the model that a tool exists. If the model requests it, the runtime invokes our local function and puts its result into the conversation. Our function returns the selected list. This is a local callback, not an MCP server. Registration supplies the implementation, the allowlist exposes the name, and the prompt requests a call.',
    'Which part is deterministic: the function result, or whether the model calls it?',
    'Release participants to Step 4. Ask them to compare the selected facts, the tool activity, and one sentence in the draft.',
    'A completed tool call does not prove factual accuracy. Putting a small fact list directly in the prompt would also be reasonable; the tool teaches application ownership and observable invocation. Permission-free reads of public sample facts are not a general policy for confidential data.',
    'instructor/museum/04-approved-facts.md\nhttps://github.com/github/copilot-sdk/blob/v1.0.11/docs/getting-started.md#how-tools-work');
}

// 5. The contrast is the lesson, not a table of API options.
{
  const slide = base('BEFORE STEPS 5-6');
  title(slide, 'Ask for a draft.\nCheck the result.');
  shape(slide, S.rect, 0.73, 2.63, 5.68, 2.55, C.blush);
  shape(slide, S.rect, 6.82, 2.63, 5.78, 2.55, C.sage);
  label(slide, 'THE PROMPT REQUESTS', 1.05, 2.98, 4.9);
  text(slide, '100-140 words', 1.05, 3.52, 4.98, 0.71, 36, C.ink, { fontFace: 'Georgia', bold: true });
  text(slide, 'The model may miss the target.', 1.05, 4.49, 4.98, 0.35, 20, C.ink);
  label(slide, 'EXAMPLE CHECK RESULT', 7.16, 2.98, 4.98);
  text(slide, '126 words: PASS', 7.16, 3.52, 4.98, 0.71, 32, C.green, { fontFace: 'Georgia', bold: true });
  text(slide, 'The same text gets the same check.', 7.16, 4.49, 4.98, 0.35, 20, C.ink);
  text(slide, 'Neither proves that a historical claim is true.', 0.75, 5.83, 11.6, 0.57, 26, C.copper, { bold: true });
  notes(slide, 'Major transition: lifecycle and objective result checks', '75 seconds',
    'The prompt describes what we want. The application checks selected requirements after the response. Step 5 first makes timeout, blank output, and cleanup explicit. Step 6 inspects the returned text with ordinary code. The narrative word range is a concrete example: asking for it and counting it are different operations.',
    'Can a draft pass every format rule and still contain an unsupported claim?',
    'Send participants to Steps 5-6. Use the fixed validation fixture to separate code behavior from model variability. Do not pause the whole room again at Step 6 unless needed.',
    'Structural failure is advisory in this sample. A model request failure is a different outcome. The validator does not establish factual grounding or check every instruction, including distinct questions. The response deadline is not a claim that every application startup or cleanup operation has that same budget.',
    'instructor/museum/05-guardrails.md\ninstructor/museum/06-structure.md');
}

// 6. Two separate outputs make the data boundary visible.
{
  const slide = base('BEFORE STEP 7');
  title(slide, 'Research is a separate conversation.');
  shape(slide, S.roundRect, 4.40, 2.22, 4.55, 0.65, C.ink);
  text(slide, 'Educator-approved facts', 4.65, 2.37, 4.05, 0.32, 22, C.white, { bold: true, align: 'center' });
  arrow(slide, 3.18, 3.00, 0, 0.45);
  arrow(slide, 10.12, 3.00, 0, 0.45);
  slide.addShape(S.line, { x: 3.18, y: 3.00, w: 6.94, h: 0, line: { color: C.green, width: 2 } });
  slide.addShape(S.line, { x: 6.68, y: 2.89, w: 0, h: 0.11, line: { color: C.green, width: 2 } });
  shape(slide, S.roundRect, 0.59, 3.35, 5.20, 3.0, C.paper,
    { fill: { color: C.paper, transparency: 100 }, line: { color: C.green, width: 1.1, dashType: 'dash' } });
  shape(slide, S.roundRect, 7.54, 3.35, 5.20, 3.0, C.paper,
    { fill: { color: C.paper, transparency: 100 }, line: { color: C.copper, width: 1.1, dashType: 'dash' } });
  shape(slide, S.roundRect, 0.73, 3.51, 4.90, 1.36, C.sage);
  shape(slide, S.roundRect, 7.68, 3.51, 4.92, 1.36, C.blush);
  text(slide, 'Drafting session', 1.05, 3.77, 4.24, 0.40, 27, C.green, { bold: true });
  text(slide, 'One local fact tool', 1.05, 4.34, 4.24, 0.31, 20, C.ink);
  text(slide, 'Research session', 8.01, 3.77, 4.25, 0.40, 27, C.copper, { bold: true });
  text(slide, 'Two Wikipedia tools via MCP', 8.01, 4.34, 4.25, 0.31, 20, C.ink);
  arrow(slide, 3.18, 4.92, 0, 0.20);
  arrow(slide, 10.12, 4.92, 0, 0.20);
  text(slide, 'Exhibit draft\n+ format checks', 0.98, 5.45, 4.60, 0.61, 21, C.green, { bold: true, valign: 'top' });
  text(slide, 'Background notes\n+ unverified links', 7.95, 5.45, 4.50, 0.61, 21, C.copper, { bold: true, valign: 'top' });
  notes(slide, 'Major transition: external tools and separate context', '75 seconds',
    'The educator may want background research, but article text is not approved evidence. Research receives the selected facts to identify the subject, then uses a separate conversation and a Wikipedia MCP server. Its notes go to the educator, not into the generation prompt. The two branches show data separation, not simultaneous execution: this sample runs optional research first, then drafting.',
    'What would change if we appended the research notes to the approved facts automatically?',
    'Release participants to Step 7. Keep generation configuration unchanged and observe the separate outputs.',
    'MCP connects tools from another program. The local Node.js server has web access and is not sandboxed by the model tool allowlist. Model-reported links are unverified; parsing does not prove source consultation. Keep the explicit no-usable-citations notice. An isolated research failure can be caught, but disconnecting all networking also prevents generation.',
    'instructor/museum/07-research.md\nhttps://github.com/github/copilot-sdk/blob/v1.0.11/docs/features/mcp.md');
}

// 7. A single artifact becomes the focal point for the optional write transition.
{
  const slide = base('OPTIONAL: BEFORE STEP 8', true);
  label(slide, 'OPTIONAL EXTENSION', 0.75, 0.99, 6.2, true);
  text(slide, 'Allow the path.\nThen check\nthe file.', 0.70, 1.50, 6.30, 2.84, 46, C.paper,
    { fontFace: 'Georgia', bold: true, valign: 'top' });
  text(slide, 'A model saying "created"\nis not file verification.',
    0.75, 4.85, 6.00, 1.0, 25, C.light);
  shape(slide, S.rect, 8.05, 1.56, 4.35, 4.62, C.paper);
  shape(slide, S.rect, 8.05, 1.56, 4.35, 0.72, C.sage);
  text(slide, 'exhibit.html', 8.35, 1.77, 3.75, 0.30, 22, C.green, { bold: true });
  label(slide, 'ONE ALLOWED OUTPUT', 8.36, 2.67, 3.73);
  text(slide, 'Capture before.\nCompare after.', 8.36, 3.16, 3.66, 1.13, 28, C.ink,
    { fontFace: 'Georgia', bold: true });
  text(slide, 'New or changed.\nNonempty. Regular file.',
    8.36, 4.68, 3.65, 0.85, 20, C.muted);
  notes(slide, 'Optional major transition: writing a local artifact', '60 seconds',
    'The HTML session gets one built-in editing tool and permission for one exact output path. That is separate from the generation and research profiles. The application captures prior file state and compares the result after the session. It confirms a new or changed nonempty regular file before reporting a verified update.',
    'If an old exhibit.html is still present, does that prove this request wrote anything?',
    'Offer Step 8 only if the group has time. Otherwise move to the final debrief. This is a local file, not website deployment.',
    'Missing, empty, unchanged, directory, or symbolic-link output is not a verified update. Do not delete prior output to manufacture success. File checks do not prove factual accuracy, safe JavaScript, accessible interaction, or absence of external requests. Inspect source before opening the generated page.',
    'instructor/museum/08-exhibit-page.md\nworkshop/museum-08-interactive-exhibit-page.md');
}

// 8. The closing asks for evidence rather than a recap of API names.
{
  const slide = base('CLOSE', true);
  text(slide, 'Show what your\napplication\ncan prove.', 0.70, 1.18, 7.05, 2.92, 47, C.paper,
    { fontFace: 'Georgia', bold: true, valign: 'top' });
  text(slide, 'Demo one result.\nExplain one limit.', 0.75, 5.02, 6.00, 1.0, 26, C.light);
  const prompts = [
    ['MODEL CHOICE', 'What did the model request?', C.blush],
    ['CODE DECISION', 'Which rule did the app enforce?', C.sage],
    ['HUMAN REVIEW', 'What still needs judgment?', C.paper],
  ];
  prompts.forEach(([heading, body, color], i) => {
    shape(slide, S.rect, 8.0, 1.49 + i * 1.63, 4.60, 1.24, color);
    label(slide, heading, 8.30, 1.75 + i * 1.63, 4.0);
    text(slide, body, 8.30, 2.12 + i * 1.63, 3.98, 0.39, 19, C.ink, { bold: true });
  });
  notes(slide, 'Closing, with or without the optional HTML step', '45 seconds',
    'Ask one participant to demonstrate or describe a result, not recite SDK method names. The model may choose a tool. The application constrains or checks something specific. A human still reviews the claims. These are reusable decisions beyond museum writing.',
    'Name one model choice, one application-enforced rule, and one remaining human decision.',
    'End the presentation after a short example. Point instructors to the companion notes and participants to the finished reference only for comparison.',
    'A passing build and a convincing answer do not establish reliability. Do not claim that a single run proves prompt-injection resistance or production readiness. Use public sample data and keep learning artifacts separate from real museum publication.',
    'instructor/museum/README.md');
}

for (const box of diagramBounds) {
  if (box.x < 0 || box.y < 0 || box.w < 0 || box.h < 0 || box.x + box.w > W + 0.01 || box.y + box.h > H + 0.01) {
    throw new Error(`Out-of-slide element: ${JSON.stringify(box)}`);
  }
}

const output = path.resolve(__dirname, '../../../docs/instructor/museum-instructor.pptx');

async function writeDeck() {
  const archive = await JSZip.loadAsync(await deck.write({ outputType: 'nodebuffer' }));
  const presentation = archive.file('ppt/presentation.xml');
  if (!presentation) throw new Error('The presentation package has no presentation.xml.');
  let xml = await presentation.async('string');
  const notesMaster = xml.match(/<p:notesMasterIdLst>[\s\S]*?<\/p:notesMasterIdLst>/g);
  if (notesMaster?.length !== 1 || !xml.includes('<p:sldIdLst>')) {
    throw new Error('Unexpected presentation structure while ordering the notes master.');
  }
  // PptxGenJS 4.0.1 puts this list after sldIdLst; OOXML requires it before.
  xml = xml.replace(notesMaster[0], '').replace('<p:sldIdLst>', notesMaster[0] + '<p:sldIdLst>');
  archive.file('ppt/presentation.xml', xml);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, await archive.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
  console.log(`Wrote ${output}`);
}

writeDeck().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
