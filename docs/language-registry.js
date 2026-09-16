(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    root.WorkshopLanguages = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    const languages = Object.freeze([
        {
            id: 'dotnet',
            displayName: '.NET',
            docsUrl: 'https://github.com/github/copilot-sdk/tree/main/dotnet',
            installCommand: 'dotnet add package GitHub.Copilot.SDK --version 1.0.11',
            runtimeNote: 'Requires the .NET SDK and a supported C# runtime.'
        },
        {
            id: 'go',
            displayName: 'Go',
            docsUrl: 'https://github.com/github/copilot-sdk/tree/main/go',
            installCommand: 'go get github.com/github/copilot-sdk/go@v1.0.11',
            runtimeNote: 'Requires a supported Go toolchain and module.'
        },
        {
            id: 'java',
            displayName: 'Java',
            docsUrl: 'https://github.com/github/copilot-sdk/tree/main/java',
            installCommand: 'mvn dependency:get -Dartifact=com.github:copilot-sdk-java:1.0.11',
            runtimeNote: 'Requires a supported JDK and a Maven or Gradle project.'
        },
        {
            id: 'nodejs',
            displayName: 'Node.js',
            docsUrl: 'https://github.com/github/copilot-sdk/tree/main/nodejs',
            installCommand: 'npm install @github/copilot-sdk@1.0.11',
            runtimeNote: 'Requires a current Node.js LTS release.'
        },
        {
            id: 'python',
            displayName: 'Python',
            docsUrl: 'https://github.com/github/copilot-sdk/tree/main/python',
            installCommand: 'pip install github-copilot-sdk==1.0.11',
            runtimeNote: 'Requires Python and an isolated virtual environment.'
        },
        {
            id: 'rust',
            displayName: 'Rust',
            docsUrl: 'https://github.com/github/copilot-sdk/tree/main/rust',
            installCommand: 'cargo add github-copilot-sdk@=1.0.11',
            runtimeNote: 'Requires Rust and Cargo from rustup.'
        }
    ]);

    const languageById = Object.freeze(Object.fromEntries(
        languages.map(language => [language.id, language])
    ));

    function getLanguage(languageId) {
        return languageById[languageId] ?? null;
    }

    return Object.freeze({ languages, getLanguage });
}));
