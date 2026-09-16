(function () {
    'use strict';

    const chapters = [
        ['overview', 'README.md', 'Teaching guide and run of show'],
        ['00-preflight', '00-preflight.md', '0. Preflight'],
        ['01-first-session', '01-first-session.md', '1. Client, session, and harness'],
        ['02-streaming', '02-streaming.md', '2. Streaming'],
        ['03-curator-voice', '03-curator-voice.md', '3. Curator voice'],
        ['04-approved-facts', '04-approved-facts.md', '4. Approved facts'],
        ['05-guardrails', '05-guardrails.md', '5. Lifecycle and controls'],
        ['06-structure', '06-structure.md', '6. Structural checks'],
        ['07-research', '07-research.md', '7. Separate research'],
        ['08-exhibit-page', '08-exhibit-page.md', '8. Local HTML output']
    ];
    const params = new URLSearchParams(location.search);
    const requestedChapter = params.get('chapter') ?? 'overview';
    const chapter = chapters.find(item => item[0] === requestedChapter);
    const selector = document.getElementById('instructorLanguage');
    const content = document.getElementById('instructorContent');
    let language = WorkshopLanguages.getLanguage(params.get('lang'))?.id ?? 'nodejs';

    function chapterUrl(id) {
        return `?chapter=${encodeURIComponent(id)}&lang=${encodeURIComponent(language)}`;
    }

    function rewriteLink(target) {
        const related = chapters.find(item => item[1] === target);
        if (related) return chapterUrl(related[0]);
        const lesson = target.match(/^\.\.\/\.\.\/workshop\/(museum-[a-z0-9-]+)\.md$/);
        if (lesson) return `../workshop/step.html?step=${lesson[1]}&lang=${language}`;
        if (target === '../../docs/instructor/museum-instructor.pptx') return 'museum-instructor.pptx';
        return target;
    }

    function renderNavigation() {
        const navigation = document.getElementById('instructorNavigation');
        navigation.replaceChildren(...chapters.map(([id, , title]) => {
            const link = document.createElement('a');
            link.href = chapterUrl(id);
            link.textContent = title;
            if (id === requestedChapter) link.setAttribute('aria-current', 'page');
            return link;
        }));
    }

    function showError(message) {
        const paragraph = document.createElement('p');
        paragraph.setAttribute('role', 'alert');
        paragraph.textContent = message;
        content.replaceChildren(paragraph);
        content.setAttribute('aria-busy', 'false');
    }

    async function load() {
        renderNavigation();
        if (!chapter) {
            showError('Unknown instructor chapter. Choose one from the chapter list.');
            return;
        }
        content.setAttribute('aria-busy', 'true');
        document.title = `${chapter[2]} | Museum instructor guide`;
        const sourceBase = location.pathname.startsWith('/docs/')
            ? new URL('../../instructor/museum/', location.href)
            : new URL('content/', location.href);
        try {
            const response = await fetch(new URL(chapter[1], sourceBase));
            if (!response.ok) throw new Error(`Instructor notes returned HTTP ${response.status}.`);
            const markdown = await response.text();
            content.innerHTML = marked.parse(markdown.replace(/\]\(([^)]+)\)/g,
                (_, target) => `](${rewriteLink(target)})`), { gfm: true });
            for (const link of content.querySelectorAll('a[href^="https://"]')) {
                link.target = '_blank';
                link.rel = 'noopener';
            }
            content.setAttribute('aria-busy', 'false');
        } catch (error) {
            showError(`Unable to load instructor notes. ${error.message}`);
        }
    }

    for (const entry of WorkshopLanguages.languages) {
        const option = document.createElement('option');
        option.value = entry.id;
        option.textContent = entry.displayName;
        selector.append(option);
    }
    selector.value = language;
    selector.addEventListener('change', () => {
        language = selector.value;
        const url = new URL(location.href);
        url.searchParams.set('lang', language);
        history.replaceState({}, '', url);
        load();
    });
    updateToggleIcon();
    load();
}());
