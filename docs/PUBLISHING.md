# Publishing

Expected repository: https://github.com/bblevick/tiny-city-lab
Expected Pages demo: https://bblevick.github.io/tiny-city-lab/

The workflow verifies code and builds with BASE_PATH=/tiny-city-lab/ before deploying through GitHub Actions Pages. Enable GitHub Actions as the repository Pages source. Local preview: `BASE_PATH=/tiny-city-lab/ npm run build && BASE_PATH=/tiny-city-lab/ npm run preview` and visit the repository path at the preview origin.

Only the static application and intended public example assets are deployed. Git ignores dependency directories, local datasets/runs, base LLM weights, virtual environments and raw captures. Profile pins are a separate UI action.

Published October 24, 2026. [First successful verification and deployment](https://github.com/bblevick/tiny-city-lab/actions/runs/40144617807). The public demo passed actual browser interactions with no page errors, failed requests or external application requests; see `public-release-check.json`. All five repositories were pinned on the profile, with Tiny City Lab first.
