# Museum Exhibit Studio: meet the project and prepare

> **Pace:** Self-paced

## What you'll build

Build an exhibit description drafting tool for a museum educator.
They select approved facts. The curator agent drafts a title, a short narrative, and three visitor questions.
The application checks the format. The educator reviews every claim.

The curator agent you'll build uses a large language model to draft museum text.
The GitHub Copilot SDK connects your application to the Copilot CLI harness.
You will write the code that configures the agent and checks its results.

You will grow one console application: first a response, then streaming, instructions, facts, checks, and separate research.
The optional final step creates a local HTML page.
Research notes never become approved facts automatically.

## Check what is already installed

Run the checks for your selected language before installing anything.
Keep a compatible installation if you already have one.
Other runtimes can remain on your machine.

:::language dotnet
| Requirement | Why the workshop needs it | Check |
|---|---|---|
| [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0) | Builds and runs the C# application | `dotnet --version` |
| [Git](https://git-scm.com/downloads) | Downloads the repository and tracks changes | `git --version` |
| [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli) | Supplies the Copilot CLI harness used by the SDK | `copilot --version` |
| [Node.js 22.12 or newer](https://nodejs.org/en/download) | Runs the Wikipedia MCP server in Step 7 | `node --version`, `npm --version`, `npx --version` |
:::
:::language nodejs
| Requirement | Why the workshop needs it | Check |
|---|---|---|
| [Node.js 22.12 or newer](https://nodejs.org/en/download) | Runs the TypeScript application and Wikipedia MCP server | `node --version` |
| npm and npx | Install packages and run the Wikipedia tool package | `npm --version`, `npx --version` |
| [Git](https://git-scm.com/downloads) | Downloads the repository and tracks changes | `git --version` |
| [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli) | Supplies the Copilot CLI harness used by the SDK | `copilot --version` |
:::
:::language python
| Requirement | Why the workshop needs it | Check |
|---|---|---|
| [Python 3.11 or newer](https://www.python.org/downloads/) | Runs the Python application | `python3 --version` or `py -3 --version` |
| pip and `venv` | Create an isolated environment and install packages | `python3 -m pip --version` or `py -3 -m pip --version` |
| [Git](https://git-scm.com/downloads) | Downloads the repository and tracks changes | `git --version` |
| [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli) | Supplies the Copilot CLI harness used by the SDK | `copilot --version` |
| [Node.js 22.12 or newer](https://nodejs.org/en/download) | Runs the Wikipedia MCP server in Step 7 | `node --version`, `npm --version`, `npx --version` |
:::
:::language go
| Requirement | Why the workshop needs it | Check |
|---|---|---|
| [Go 1.24 or newer](https://go.dev/doc/install) | Builds and runs the Go application | `go version` |
| [Git](https://git-scm.com/downloads) | Downloads the repository and tracks changes | `git --version` |
| [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli) | Supplies the Copilot CLI harness used by the SDK | `copilot --version` |
| [Node.js 22.12 or newer](https://nodejs.org/en/download) | Runs the Wikipedia MCP server in Step 7 | `node --version`, `npm --version`, `npx --version` |
:::
:::language rust
| Requirement | Why the workshop needs it | Check |
|---|---|---|
| [Rust 1.94 or newer](https://www.rust-lang.org/tools/install) | Builds the Rust application | `rustc --version` |
| Cargo | Downloads dependencies and runs the application | `cargo --version` |
| [Git](https://git-scm.com/downloads) | Downloads the repository and tracks changes | `git --version` |
| [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli) | Supplies the Copilot CLI harness used by the SDK | `copilot --version` |
| [Node.js 22.12 or newer](https://nodejs.org/en/download) | Runs the Wikipedia MCP server in Step 7 | `node --version`, `npm --version`, `npx --version` |
:::
:::language java
| Requirement | Why the workshop needs it | Check |
|---|---|---|
| [Java Development Kit 17 or newer](https://adoptium.net/installation/) | Compiles and runs the Java application | `java -version` |
| [Apache Maven 3.9 or newer](https://maven.apache.org/install.html) | Downloads dependencies and builds the project | `mvn --version` |
| [Git](https://git-scm.com/downloads) | Downloads the repository and tracks changes | `git --version` |
| [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli) | Supplies the Copilot CLI harness used by the SDK | `copilot --version` |
| [Node.js 22.12 or newer](https://nodejs.org/en/download) | Runs the Wikipedia MCP server in Step 7 | `node --version`, `npm --version`, `npx --version` |
:::

The version output can include additional patch information.
For example, Node.js `v22.12.1` satisfies the `22.12 or newer` requirement.

<details>
<summary>Install the selected language tools</summary>

:::language dotnet
Install the [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0).
Install the SDK, not only the .NET Runtime.
:::

:::language nodejs
Install [Node.js 22.12 or newer](https://nodejs.org/en/download).
The standard installer includes npm and npx.
:::

:::language python
Install [Python 3.11 or newer](https://www.python.org/downloads/).
Select the option that adds Python to your command path when the installer provides one.
Python includes the `venv` module and normally includes pip.
:::

:::language go
Install [Go 1.24 or newer](https://go.dev/doc/install).
The installation includes the compiler and the `go` command.
:::

:::language rust
Install Rust with [rustup](https://www.rust-lang.org/tools/install).
It installs `rustc` and Cargo.
:::

:::language java
Install a [Java Development Kit 17 or newer](https://adoptium.net/installation/).
Install [Apache Maven 3.9 or newer](https://maven.apache.org/install.html).
Run `mvn --version` afterward and check that it reports the intended JDK.
:::

</details>

<details>
<summary>Install Git and Copilot CLI</summary>

Install [Git](https://git-scm.com/downloads).

Install the [GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli).
The Copilot CLI supplies the harness used by the GitHub Copilot SDK.
Reopen the terminal if `copilot --version` is not found after installation.

You need a GitHub account with Copilot CLI access.
Your organisation may need to enable that access.

Run:

```bash
copilot login
```

Follow the sign-in instructions.
Use the account that has Copilot CLI access.

</details>

<details>
<summary>Install Node.js for Wikipedia research</summary>

Step 7 connects the curator agent to Wikipedia tools through **Model Context Protocol (MCP)**.
Those tools run in a separate Node.js process.

Install [Node.js 22.12 or newer](https://nodejs.org/en/download) if the check does not meet the requirement.
The standard installer includes npm and npx.

:::language nodejs
The same Node.js installation runs the workshop application and the Wikipedia tool program.
:::

:::language dotnet
Your application still runs on .NET. Node.js runs only the Wikipedia tool program.
:::

:::language python
Your application still runs on Python. Node.js runs only the Wikipedia tool program.
:::

:::language go
Your application still runs on Go. Node.js runs only the Wikipedia tool program.
:::

:::language rust
Your application still runs on Rust. Node.js runs only the Wikipedia tool program.
:::

:::language java
Your application still runs on Java. Node.js runs only the Wikipedia tool program.
:::

Check access to the pinned package:

```bash
npm view wikipedia-mcp@1.0.3 version
```

The command should print `1.0.3`.
It does not start a server or send a model request.

</details>

<details>
<summary>Troubleshoot the prerequisite checks</summary>

| Symptom | What to do |
|---|---|
| A command is not found | Complete the matching installation section, then reopen the terminal. |
| The version is too old | Install a supported version, then reopen the terminal. |
| `copilot login` cannot use your account | Check Copilot CLI access or contact your organisation administrator. |
| npm cannot read the Wikipedia package metadata | Check network and proxy access. Do not change the pinned package version. |
| More than one runtime is installed | That is allowed. Check which version this terminal uses. |

</details>

Prompts and tool results can reach the configured model service and consume account usage.
Use public sample facts. Do not enter credentials or private museum material.

## What the starter provides

This workshop contains a starter application. The starter supplies fact sets, a fact tool, terminal questions, streaming output, validators, and scoped permission helpers.
These are application code provided for this workshop, not automatic SDK features.
You write the instructions, prompts, session settings, and code connecting them.
Keep the supplied helpers unchanged.

## Clone the workshop repository

Open a terminal in the folder where you keep projects.
The following commands create a `copilot-sdk-workshop` folder and enter it.
If you already cloned this repository, use that copy instead of cloning inside it.

```bash
git clone https://github.com/jamesmontemagno/copilot-sdk-workshop.git
cd copilot-sdk-workshop
```

Check that the terminal is at the repository root before you enter a starter:

<!-- code-id: museum-00-preflight-shared-3 -->
```text
git rev-parse --show-toplevel
```

The printed path must be the `copilot-sdk-workshop` directory you just entered.

You will edit the starter inside this repository.
Use `git status` to see your changes.
Keep one working copy for this track through every lesson.

## Build and open your starter

Run the commands for your selected language from the repository root.
The first command enters the folder where you will work for the rest of the workshop.
Use the shell tabs where command paths differ.

:::language dotnet
Enter the .NET starter with the first command.
`dotnet restore` downloads the pinned packages.
The next two commands build the application and run it without another build:

```bash
cd start-museum/dotnet
dotnet restore
dotnet build --no-restore
dotnet run --no-build
```

The build must succeed.
The program prints `=== Museum Exhibit Studio starter ===` and identifies the helpers in `Helpers/`.

Keep the terminal in `start-museum/dotnet`.
Open that same folder in your editor. For VS Code, enter `code .` if its command is installed.

You edit `Program.cs`, the entrypoint.
The supplied `Helpers/Curator*.cs` files belong to the `MuseumExhibitStudio.Helpers` namespace.
That namespace groups their names for use in your code.
:::

:::language nodejs
Enter the Node.js starter with the first command.
`npm ci` installs the versions recorded in `package-lock.json`, called the **lockfile**.
Keep it unchanged so your dependencies match the examples.

`npm run build` checks the TypeScript source.
`npm start` runs the starter.
The package settings select these commands for you:

```bash
cd start-museum/nodejs
npm ci --ignore-scripts --no-audit --fund=false
npm run build
npm start
```

The build must succeed.
The program prints `=== Museum Exhibit Studio starter ===` and identifies `src/curator.ts` as its helper module.

Keep the terminal in `start-museum/nodejs`.
Open that same folder in your editor. For VS Code, enter `code .` if its command is installed.

You edit `src/index.ts`, the entrypoint.
Keep the supplied functions in `src/curator.ts` unchanged.
The lockfile pins Copilot SDK 1.0.11 and its compatible `@github/copilot` 1.0.80 package.
:::

:::language python
Enter the Python starter with the first command in your shell's tab.
The second command creates `.venv`, the project's virtual environment.
Its Python interpreter runs every following command, so no activation step is needed.

The package installation uses the versions in `requirements.txt`, including Copilot SDK 1.0.11.
The compile command checks syntax. The final command runs the starter:

<div class="workshop-tabs" data-tabs>
  <div role="tablist" aria-label="Prepare the Python museum starter">
    <button type="button" role="tab" aria-selected="true" data-tab="museum-python-windows">PowerShell</button>
    <button type="button" role="tab" aria-selected="false" data-tab="museum-python-unix">Bash</button>
  </div>
  <div role="tabpanel" data-panel="museum-python-windows">
    <pre><code class="language-powershell">cd start-museum/python
py -3 -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
.venv/Scripts/python.exe -m py_compile main.py curator.py
.venv/Scripts/python.exe main.py</code></pre>
  </div>
  <div role="tabpanel" data-panel="museum-python-unix" hidden>
    <pre><code class="language-bash">cd start-museum/python
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m py_compile main.py curator.py
.venv/bin/python main.py</code></pre>
  </div>
</div>

The syntax check must succeed.
The program prints `=== Museum Exhibit Studio starter ===` and identifies `curator.py` as its helper module.

Keep the terminal in `start-museum/python`.
Open that same folder in your editor. For VS Code, enter `code .` if its command is installed.

You edit `main.py`, the entrypoint.
Keep the supplied functions in `curator.py` unchanged.
Use the `.venv` interpreter shown in your shell's tab for later runs too.
:::

:::language go
Enter the Go starter with the first command.
`go mod download` retrieves its pinned dependencies, including Copilot SDK 1.0.11.
`go build` checks and compiles the project without changing its module requirements.
`go run .` runs the whole package, including its supplied helper file:

```bash
cd start-museum/go
go mod download
go build -mod=readonly ./...
go run .
```

The build must succeed.
The program prints `=== Museum Exhibit Studio starter ===` and identifies `curator.go` as its helper file.

Keep the terminal in `start-museum/go`.
Open that same folder in your editor. For VS Code, enter `code .` if its command is installed.

You edit `main.go`, the entrypoint.
`curator.go` is in the same `main` package, so its functions need no import.
Keep that helper file unchanged.
:::

:::language rust
Enter the Rust starter with the first command.
`cargo fetch --locked` downloads the versions in `Cargo.lock`.
`cargo check --locked` checks the code against those dependencies.
`cargo run --locked` builds and runs the starter:

```bash
cd start-museum/rust
cargo fetch --locked
cargo check --locked
cargo run --locked
```

Cargo must leave `Cargo.lock` unchanged.
The program prints `=== Museum Exhibit Studio starter ===` and identifies `src/lib.rs` as its helper module.

Keep the terminal in `start-museum/rust`.
Open that same folder in your editor. For VS Code, enter `code .` if its command is installed.

You edit `src/main.rs`, the entrypoint.
`src/lib.rs` defines the supplied `museum_exhibit_studio` library crate, a module your entrypoint imports.
Keep that helper file unchanged.
:::

:::language java
Enter the Java starter with the first command.
Maven reads `pom.xml` to download dependencies, including Copilot SDK 1.0.11.
The next commands compile the source and run its configured main class:

```bash
cd start-museum/java
mvn dependency:go-offline
mvn compile
mvn exec:java
```

Maven must finish successfully.
The program prints `=== Museum Exhibit Studio starter ===` and identifies the helper folder `src/main/java/workshop/`.

Keep the terminal in `start-museum/java`.
Open that same folder in your editor. For VS Code, enter `code .` if its command is installed.

You edit `src/main/java/workshop/MuseumExhibitStudio.java`, the entrypoint.
The `Curator*.java` files beside it contain the supplied helpers.
They share the `workshop` package. Keep them unchanged.
:::

## Ready for Step 1

Continue when the starter builds, its welcome message appears, and Copilot CLI is signed in.
The starter makes no model request. Step 1 will check that connection.
Keep your editor and terminal in the selected starter folder.

If a command is missing, reopen the terminal after installation.
For package errors, check network access before changing pinned versions.

<details>
<summary>Recover without losing your work</summary>

Run one application instance per starter directory.
Inspect `git status --short` and `git diff` before restoring anything.
Back up edited and untracked files outside the repository and check the backup.
To restore one tracked file, use `git restore --source=HEAD -- <exact-file-path>` from the repository root.
Replace the placeholder with its exact path. This discards only that file's edits.
Do not restore whole directories or delete untracked work.

</details>

## Learn more

Optional reference: [Copilot SDK setup](https://github.com/github/copilot-sdk/blob/v1.0.11/docs/README.md).

Continue to [Your first curator session](museum-01-first-curator-session.md).
