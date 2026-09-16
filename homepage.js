(function () {
    'use strict';

    const storageKey = 'copilot-sdk-workshop.language';
    const picker = document.getElementById('languagePicker');
    const languageInputs = [...document.querySelectorAll('input[name="language"]')];
    const startLink = document.getElementById('startWorkshopLink');
    const docsLink = document.getElementById('sdkDocsLink');
    const summary = document.getElementById('languageSummary');
    const workshopInputs = [...document.querySelectorAll('input[name="workshop"]')];
    const targetAppLink = document.getElementById('targetAppLink');
    const previewTitle = document.getElementById('previewTitle');
    const preview = document.getElementById('workshopPreview');
    const startGuidance = document.getElementById('startGuidance');
    let selectedWorkshopId = null;

    const workshops = {
        sdlc: {
            name: 'Accessibility reviewer',
            previewTitle: 'Accessibility Reviewer',
            preview: `You provide
A public practice-page URL.

The agent requests
Browser evidence and guidance from your
application's accessibility catalog.

You inspect
A report connecting observed problems
to suggested fixes and review limits.`,
            guidance: 'Start with the accessibility project introduction and machine setup.'
        },
        museum: {
            name: 'Museum Exhibit Studio',
            previewTitle: 'Museum Exhibit Studio',
            preview: `You provide
A small list of approved museum facts.

The agent requests
Those facts from your application
and writes an exhibit draft.

You inspect
A title, a short narrative, and three
visitor questions, with format checks.
You review every claim before use.`,
            guidance: 'Start with the museum scenario, then prepare your machine.'
        }
    };

    function getStoredLanguageId() {
        try {
            return window.localStorage.getItem(storageKey);
        } catch (error) {
            return null;
        }
    }

    function storeLanguageId(languageId) {
        try {
            window.localStorage.setItem(storageKey, languageId);
        } catch (error) {
            // Local storage can be unavailable in private browsing contexts.
        }
    }

    function updateSelection(languageId) {
        const language = WorkshopLanguages.getLanguage(languageId);
        const hasLanguage = language !== null;
        const workshop = selectedWorkshopId ? workshops[selectedWorkshopId] : null;
        const ready = workshop !== null && hasLanguage;

        picker.disabled = workshop === null;
        document.querySelectorAll('.language-option').forEach(option => {
            option.classList.toggle('selected', option.dataset.language === language?.id);
        });
        startLink.classList.toggle('disabled', !ready);
        startLink.setAttribute('aria-disabled', String(!ready));
        startLink.href = ready
            ? WorkshopLanguageNavigation.firstLessonUrl(language.id, selectedWorkshopId)
            : workshop ? '#language-picker' : '#workshop-picker';
        startLink.textContent = ready ? `Start ${workshop.name}` : 'Start selected workshop';
        targetAppLink.hidden = selectedWorkshopId !== 'sdlc';

        if (!hasLanguage) {
            docsLink.removeAttribute('href');
            docsLink.setAttribute('aria-disabled', 'true');
            summary.textContent = workshop
                ? `Choose a language you know for ${workshop.name}.`
                : 'Choose a project, then select the language you want to use.';
            startGuidance.textContent = workshop?.guidance ??
                'Choose a project and language to open its introduction and setup instructions.';
            return;
        }

        docsLink.href = language.docsUrl;
        docsLink.removeAttribute('aria-disabled');
        docsLink.textContent = `${language.displayName} SDK docs ↗`;
        summary.textContent = workshop
            ? `You'll follow the ${language.displayName} instructions for ${workshop.name}. Setup covers the tools this project needs.`
            : 'Choose a project to continue.';
        startGuidance.textContent = workshop?.guidance ?? 'Choose a project to continue.';
    }

    function selectWorkshop(workshopId) {
        selectedWorkshopId = workshops[workshopId] ? workshopId : null;
        document.querySelectorAll('.workshop-option').forEach(option => {
            option.classList.toggle('selected', option.dataset.workshop === selectedWorkshopId);
        });
        const workshop = selectedWorkshopId ? workshops[selectedWorkshopId] : null;
        previewTitle.textContent = workshop?.previewTitle ?? 'Your application';
        preview.textContent = workshop?.preview ?? 'Choose a project to see its input, its work, and the result you will inspect.';
        updateSelection(languageInputs.find(input => input.checked)?.value ?? null);
        if (workshop) {
            languageInputs[0].focus();
        }
    }

    languageInputs.forEach(input => {
        input.addEventListener('change', () => {
            const language = WorkshopLanguages.getLanguage(input.value);
            storeLanguageId(language.id);
            updateSelection(language.id);
        });
    });

    workshopInputs.forEach(input => {
        input.addEventListener('change', () => selectWorkshop(input.value));
    });

    startLink.addEventListener('click', event => {
        if (startLink.getAttribute('aria-disabled') === 'true') {
            event.preventDefault();
            if (!selectedWorkshopId) {
                workshopInputs[0].focus();
            } else {
                languageInputs[0].focus();
                languageInputs[0].reportValidity();
            }
        }
    });

    const initialLanguage = WorkshopLanguageNavigation.resolveLanguage(
        window.location.search,
        getStoredLanguageId(),
        WorkshopLanguages.getLanguage
    );
    if (initialLanguage) {
        const matchingLanguage = languageInputs.find(input => input.value === initialLanguage.id);
        matchingLanguage.checked = true;
        storeLanguageId(initialLanguage.id);
    }

    const requestedWorkshop = new URLSearchParams(window.location.search).get('workshop');
    const matchingWorkshop = workshopInputs.find(input => input.value === requestedWorkshop);
    if (matchingWorkshop) {
        matchingWorkshop.checked = true;
        selectWorkshop(matchingWorkshop.value);
    } else {
        updateSelection(initialLanguage?.id ?? null);
    }
}());
