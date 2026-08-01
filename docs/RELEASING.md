# Releasing Blueprint

This guide covers cutting a release, what each platform produces, and how to
configure **code signing** so that distributed bundles are signed and
installable. Signing is secret-conditional: the release pipeline produces
unsigned bundles until the certificates are configured.

Cross-reference: [CONTRIBUTING.md](../CONTRIBUTING.md) covers setup, branching,
and testing. [ARCHITECTURE.md](../ARCHITECTURE.md) documents the desktop app
itself.

---

## Cutting a release

The Release workflow (`.github/workflows/release.yml`) is triggered in two ways:

1. **Pushing a version tag** — the normal release path. It builds bundles for
   all three platforms and publishes them as a GitHub Release:

   ```bash
   git checkout develop && git pull
   git tag v0.1.0
   git push origin v0.1.0
   ```

   The tag must be a `v*` tag (e.g. `v0.1.0`, `v0.2.1`). Release name is
   `Blueprint v<version>` where `<version>` is read from
   `apps/desktop/src-tauri/tauri.conf.json`.

2. **Manual `workflow_dispatch`** — open **Actions → Release → Run workflow**.
   This builds and uploads artifacts as an Actions artifact but **does not**
   create a GitHub Release. Useful for testing a build or signing before
   tagging.

Both paths run the same matrix (macOS, Windows, Linux). The job is
`publish`; `concurrency` is keyed on `github.ref` so only one release build
runs per ref at a time.

## What each OS produces

| OS     | Bundle(s)                                             | Location in the Release |
| ------ | ----------------------------------------------------- | ----------------------- |
| macOS  | `Blueprint_0.1.0_aarch64.dmg` + `.app` bundle (in `.dmg`), `x64` variant | Release assets |
| Windows| `Blueprint_0.1.0_x64-setup.exe` (NSIS) and `Blueprint_0.1.0_x64_en-US.msi` (WiX) | Release assets |
| Linux  | `Blueprint_0.1.0_amd64.AppImage` and `Blueprint_0.1.0_amd64.deb` | Release assets |

`bundle.targets` is `"all"`, so each OS builds every format it can. macOS
builds both architectures on the `macos-latest` arm64 runner; the `x64`
variant is produced by the same job via Tauri's universal/cross-arch handling
(see Tauri docs if you need to pin this).

The build directory on a local machine is
`apps/desktop/src-tauri/target/release/bundle/`.

## Code-signing overview

Signing is **entirely secret-conditional**. If a signing secret is empty, the
corresponding step is skipped and Tauri builds an unsigned bundle. Once you add
the secrets, the **next** release build signs automatically — no workflow code
changes.

Secrets are added at **Settings → Secrets and variables → Actions → New
repository secret**.

| Secret                        | Used by        | Purpose                                                        |
| ----------------------------- | -------------- | -------------------------------------------------------------- |
| `APPLE_CERTIFICATE`           | macOS          | Base64-encoded `.p12` Developer ID Application certificate     |
| `APPLE_CERTIFICATE_PASSWORD`  | macOS          | Password for the `.p12`                                        |
| `APPLE_ID`                    | macOS          | Apple ID used for notarization                                 |
| `APPLE_PASSWORD`              | macOS          | App-specific password for `APPLE_ID` (see below)               |
| `APPLE_TEAM_ID`               | macOS          | Team ID (e.g. `AB12CD3EFG`)                                    |
| `WINDOWS_CERTIFICATE`         | Windows        | Base64-encoded `.pfx`/`.p12` code-signing certificate          |
| `WINDOWS_CERTIFICATE_PASSWORD`| Windows        | Password for the `.pfx`/`.p12`                                 |

No signing secret exists for Linux — AppImage/deb artifacts are unsigned (see
[Linux](#linux-unsigned-bundles)).

> **Security note:** GitHub Actions never prints secret values; they are masked
> in logs. Keep `.p12`/`.pfx` files out of the repository.

## macOS signing & notarization

To produce bundles that Gatekeeper accepts, sign with a **Developer ID
Application** certificate and **notarize** with Apple.

### Obtaining the certificate

1. Enroll in the **Apple Developer Program** (paid) and go to
   [developer.apple.com/account](https://developer.apple.com/account).
2. In **Certificates, Identifiers & Profiles → Certificates (+)** choose
   **Developer ID Application**.
3. Generate a Certificate Signing Request from **Keychain Access →
   Certificate Assistant → Request a Certificate From a Certificate
   Authority**, upload it, and download the issued `.cer`.
4. Double-click the `.cer` to install it into the keychain, then **export** it
   as a **`.p12`** (Keychain Access → right-click the certificate → Export…).
   You will set a password for the `.p12` — this becomes
   `APPLE_CERTIFICATE_PASSWORD`.

### Encoding the certificate

The workflow receives the `.p12` as base64 text:

```bash
base64 -i DeveloperIDApplication.p12 -o apple-cert.b64   # macOS/Linux
# or on Windows PowerShell:
# [Convert]::ToBase64String([IO.File]::ReadAllBytes('DeveloperIDApplication.p12'))
```

Copy the entire contents of `apple-cert.b64` into the `APPLE_CERTIFICATE`
secret, and the `.p12` password into `APPLE_CERTIFICATE_PASSWORD`.

### Notarization credentials

`APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` are passed to Tauri's bundler,
which notarizes and staples the app. `APPLE_PASSWORD` must be an
**app-specific password** — a regular Apple ID password will not work:

1. Sign in at [appleid.apple.com](https://appleid.apple.com) →
   **Sign-In and Security → App-Specific Passwords**.
2. Generate one for "Blueprint" and use it as `APPLE_PASSWORD`.
3. `APPLE_TEAM_ID` is the 10-character Team ID shown in
   developer.apple.com/account.

### What the workflow does

When `APPLE_CERTIFICATE` is set, the macOS job decodes it, imports it into a
dedicated signing keychain, and marks it searchable by `codesign` and
`notarytool`. Tauri v2 also reads `APPLE_CERTIFICATE`/`APPLE_CERTIFICATE_PASSWORD`
directly from the environment, so signing and notarization happen inside the
`tauri-action` step. Notarization requires all three of `APPLE_ID`,
`APPLE_PASSWORD`, `APPLE_TEAM_ID`; if signing is enabled but these are missing,
the build fails rather than shipping an unsigned app by accident.

`bundle.macOS.minimumSystemVersion` is set to `10.15` in `tauri.conf.json`.
`bundle.macOS.signingIdentity` is deliberately left unset so unsigned builds
still succeed; Tauri uses the imported certificate's identity when one is
present.

## Windows signing

Signing the NSIS/MSI installers removes the "Unknown publisher" SmartScreen
warning for users.

### Getting a certificate

Two options:

- **Code-signing certificate (EV recommended).** Buy one from a CA (DigiCert,
  Sectigo, SSL.com, etc.). EV certificates also help with SmartScreen
  reputation. Export the certificate chain (with the private key) as a
  **`.pfx`** and set a password.
- **Azure Trusted Signing** (Microsoft's managed signing service). This uses
  Tauri's `signCommand` instead of a local certificate and is documented by
  Tauri; the workflow in this repo uses the simpler `.pfx` path. If you switch,
  set `bundle.windows.signCommand` and remove the thumbprint injection.

### Encoding the certificate

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes('certificate.pfx'))
```

Paste the output into the `WINDOWS_CERTIFICATE` secret and the `.pfx` password
into `WINDOWS_CERTIFICATE_PASSWORD`.

### What the workflow does

When `WINDOWS_CERTIFICATE` is set, the Windows job decodes the `.pfx`, imports
it into the **current user's** personal store (`cert:\CurrentUser\My`), reads
its **thumbprint**, and injects it into `apps/desktop/src-tauri/tauri.conf.json`
under `bundle.windows.certificateThumbprint` **before** `tauri-action` runs.
Tauri's bundler then signs each binary with `signtool sign /sha1 <thumbprint> …`.

- **Time-stamping:** Tauri invokes signtool, which supports RFC 3161
  time-stamping via `bundle.windows.timestampUrl` (+ `bundle.windows.tsp`).
  Add a timestamp server for your CA (e.g. for DigiCert
  `http://timestamp.digicert.com`) so signatures stay valid after the
  certificate expires. With no URL configured, binaries are signed without a
  timestamp.
- **Digest:** defaults to SHA-256 (`signtool sign /fd sha256`), which is what
  you want for Windows 10/11.

### SmartScreen realities

An unsigned installer shows **"Windows protected your PC — Windows SmartScreen
prevented an unrecognized app from starting"**, and users must click **More
info → Run anyway**. A standard (non-EV) cert removes the "unknown publisher"
warning but SmartScreen may still show a warning until the app builds
**reputation** with Windows (install counts over time, no malware reports). An
EV certificate plus Microsoft SmartScreen application reputation submission is
the path to a fully clean install.

## Linux (unsigned bundles)

Linux AppImage and `.deb` artifacts are shipped unsigned. AppImages run
unmodified on most distros; `.deb` installs via `dpkg`/`apt`. GPG-signed
repositories and AppImage signing are documented future work — see
`PROJECT_AUDIT.md`.

## Updater / auto-update (NOT implemented)

Blueprint does **not** implement in-app auto-update yet: there is no
`tauri-plugin-updater` and `createUpdaterArtifacts` is intentionally **not**
set in the bundle config. Users get new versions by **downloading the installer
from the GitHub Release page**. Do not claim auto-update support in release
notes until the updater plugin is added.

## End-user install flow

- **macOS:** Download the `.dmg`, open it, drag the Blueprint `.app` into
  **Applications**, then open it from Launchpad/Applications.
  - Unsigned builds: Gatekeeper may block the app. Right-click (or
    Control-click) the app → **Open → Open**.
  - Signed + notarized builds: open normally; the first launch shows no warning.
- **Windows:** Download `Blueprint_<ver>_x64-setup.exe` (or the `.msi`) and run
  it. The installer installs the WebView2 runtime if missing (bootstrapper
  mode), then launches Blueprint.
  - Unsigned: SmartScreen warning → **More info → Run anyway**.
  - Signed: warning-free (once reputation is established).
- **Linux:** Download the `.AppImage`, `chmod +x`, run it; or install the
  `.deb` with `sudo dpkg -i Blueprint_<ver>_amd64.deb` (or `sudo apt install
  ./Blueprint_<ver>_amd64.deb`).

## Verifying a signed release

- **macOS:** `spctl -a -vv /Applications/Blueprint.app` and
  `codesign --verify --deep --strict /Applications/Blueprint.app`; check
  `xcrun stapler validate /Applications/Blueprint.app`.
- **Windows:** `signtool verify /pa /v Blueprint_<ver>_x64-setup.exe`.
- **GitHub UI:** the release assets are marked with a verified-publisher badge
  for signed macOS builds.

## Troubleshooting

| Symptom | Likely cause |
| ------- | ------------ |
| Build fails on macOS with a codesign/identity error | `APPLE_CERTIFICATE` is set but the `.p12` password is wrong, or the certificate is not a **Developer ID Application** cert. |
| macOS build fails "Missing credentials" / notarization error | One of `APPLE_ID`/`APPLE_PASSWORD`/`APPLE_TEAM_ID` is missing or `APPLE_PASSWORD` is not an app-specific password. |
| Windows signtool error / thumbprint not found | `WINDOWS_CERTIFICATE`/`WINDOWS_CERTIFICATE_PASSWORD` mismatch, or the certificate's private key is not exportable. |
| Bundles still unsigned after adding secrets | Secrets were added after the build started; rerun the workflow (`workflow_dispatch`). |
