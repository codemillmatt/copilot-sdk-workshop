(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.WorkshopMarkdown = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    function directiveError(lineNumber, message) {
        return new Error(`Language directive error on line ${lineNumber}: ${message}`);
    }

    function preprocessLanguageDirectives(markdown, languageId, getLanguage) {
        if (typeof markdown !== 'string') {
            throw new TypeError('Markdown must be a string.');
        }
        if (typeof getLanguage !== 'function' || !getLanguage(languageId)) {
            throw new Error(`A valid workshop language is required to render this lesson: "${languageId ?? ''}".`);
        }

        const output = [];
        let activeLanguageId = null;
        const lines = markdown.split(/\r?\n/);

        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            const languageMatch = line.match(/^:::language\s+(\S+)\s*$/);
            const closingMatch = /^:::\s*$/.test(line);
            const directiveLike = line.startsWith(':::');

            if (languageMatch) {
                if (activeLanguageId !== null) {
                    throw directiveError(lineNumber, 'language blocks cannot be nested.');
                }
                if (!getLanguage(languageMatch[1])) {
                    throw directiveError(lineNumber, `unknown language "${languageMatch[1]}".`);
                }
                activeLanguageId = languageMatch[1];
                return;
            }

            if (closingMatch) {
                if (activeLanguageId === null) {
                    throw directiveError(lineNumber, 'closing directive has no open language block.');
                }
                activeLanguageId = null;
                return;
            }

            if (directiveLike) {
                throw directiveError(lineNumber, 'expected :::language <id> or :::.');
            }

            if (activeLanguageId === null || activeLanguageId === languageId) {
                output.push(line);
            }
        });

        if (activeLanguageId !== null) {
            throw directiveError(lines.length, `language block for "${activeLanguageId}" is not closed.`);
        }

        return output.join('\n');
    }

    return Object.freeze({ preprocessLanguageDirectives });
}));
