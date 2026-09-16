(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.WorkshopLanguageNavigation = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    function resolveLanguage(search, storedLanguageId, getLanguage) {
        const parameters = new URLSearchParams(search);
        if (parameters.has('lang')) {
            return getLanguage(parameters.get('lang'));
        }
        return getLanguage(storedLanguageId);
    }

    function lessonUrl(stepId, languageId) {
        const parameters = new URLSearchParams({ step: stepId });
        if (languageId) {
            parameters.set('lang', languageId);
        }
        return `?${parameters.toString()}`;
    }

    function homeUrl(languageId, workshopId) {
        const parameters = new URLSearchParams();
        if (languageId) {
            parameters.set('lang', languageId);
        }
        if (workshopId) {
            parameters.set('workshop', workshopId);
        }
        const query = parameters.toString();
        return query ? `../index.html?${query}` : '../index.html';
    }

    function firstLessonUrl(languageId, workshopId = 'sdlc') {
        const firstStep = workshopId === 'museum'
            ? 'museum-00-preflight'
            : '00-preflight';
        return `workshop/step.html${lessonUrl(firstStep, languageId)}`;
    }

    return Object.freeze({ resolveLanguage, lessonUrl, homeUrl, firstLessonUrl });
}));
