# Changelog

All notable changes to **gpt-image-2-studio** are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] · 2026-08-01

### Added
- First public release of the macOS desktop client.
- Native shell for OpenAI's **gpt-image-2** image generation model.
- Multiple aspect ratios: `21:9`, `16:9`, `3:2`, `4:3`, `1:1`, `3:4`, `2:3`, `9:16`.
- Three resolution tiers: `1K`, `2K`, `4K`.
- Three quality tiers: `Low`, `Med`, `High`.
- Quantity selector (1–4 plates per prompt).
- Reference image upload (drag-and-drop or click; supports JPG / PNG / WebP).
- Five built-in presets: **E-Commerce / Photography / Poster Design / Creative Art / Fine Art**.
- In-app archive of the most recent 005 generations with full prompt metadata.
- One-click save of generated plates to disk.
- Multi-provider API key configuration (BYO key).
- Universal macOS design language, English/Chinese mixed UI.

### Platform
- Apple Silicon (M-series) DMG, signed as an un-notarized developer build.
- Intel Mac, Windows, and Linux builds **planned** for future releases.

### Notes
- The app is a **client only**. You supply your own API key. Costs depend on
  the provider you configure and are typically a few cents to a few dozen cents
  per image.
- On first launch, macOS may show a "damaged" warning because the binary is
  not notarized. See the README for the standard workaround.
