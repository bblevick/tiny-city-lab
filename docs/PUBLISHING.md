# Publishing

Expected repository: https://github.com/bblevick/tiny-city-lab
Expected Pages demo: https://bblevick.github.io/tiny-city-lab/

The workflow verifies code and builds with BASE_PATH=/tiny-city-lab/ before deploying through GitHub Actions Pages. Enable GitHub Actions as the repository Pages source. Local preview: `BASE_PATH=/tiny-city-lab/ npm run build && npm run preview` and visit the repository path at the preview origin.

Only the static application and intended public example assets are deployed. Git ignores dependency directories, local datasets/runs, base LLM weights, virtual environments and raw captures. Profile pins are a separate UI action.
