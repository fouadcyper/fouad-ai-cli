# Release and npm

The package is `fouad-ai` and the executable is `fouad`. npm publication is currently incomplete because the registry requires valid 2FA. The website therefore labels npm installation as unavailable and presents source installation.

Before publication run `npm pack`, install the tarball into a temporary prefix, and execute `fouad --version` and `fouad doctor` from `/tmp`. Publication requires a human, npm 2FA, and reviewed provenance configuration.
