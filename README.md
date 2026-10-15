# The Shipyard

A minimal, beautifully branded writing space built with Next.js and Obsidian.

**Live site:** [theshipyard.cc](https://theshipyard.cc)

## Overview

The Shipyard is a personal writing platform that prioritizes:
- **Beautiful reading experience** — Clean typography, generous spacing, distraction-free
- **Effortless publishing** — Write in Obsidian, add `published: true`, done
- **Strong visual identity** — Anchor brand colors, nautical theme, sophisticated aesthetic
- **Maximum simplicity** — No unnecessary features, minimal navigation, pure content focus

## Architecture

- **Site:** Next.js 15 (App Router) with TypeScript and Tailwind CSS
- **Content:** Markdown files with YAML frontmatter
- **Publishing:** Obsidian plugin automates Git operations
- **Deployment:** Vercel (auto-deploy on push to main)

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Setup

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd shipyard-web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

### Adding Content

Content lives in the `/content` directory, organized by type:

```
content/
  essays/      # Long-form writing
  notes/       # Short observations
  creative/    # Fiction, poetry, experimental
```

Each markdown file requires frontmatter:

```yaml
---
published: true
title: "Your Title"
date: "2026-07-19"
type: essay  # essay | note | creative
excerpt: "Optional preview text"
tags: [optional, tags]
featured: false  # Set true for homepage feature
---
```

## Obsidian Plugin

The Shipyard includes a custom Obsidian plugin for seamless publishing.

### Installing the Plugin

See [obsidian-plugin/README.md](obsidian-plugin/README.md) for detailed installation and configuration instructions.

### Quick Start

1. Build plugin:
   ```bash
   cd obsidian-plugin
   npm install && npm run build
   ```

2. Copy to Obsidian vault:
   ```bash
   cp main.js manifest.json /path/to/vault/.obsidian/plugins/shipyard-publisher/
   ```

3. Configure repository path in plugin settings

4. Write in Obsidian, add `published: true`, save — plugin handles the rest

## Deployment

### Vercel

1. Push code to GitHub
2. Import repository in Vercel
3. Configure custom domain (theshipyard.cc)
4. Vercel auto-detects Next.js, deploys on every push to main

### Environment

`SESSION_SECRET` is required for account and comment features: it seals the session cookie and must be at least 32 characters. Generate one and set it in the Vercel project (Production, Preview, and Development):

```
openssl rand -base64 32
```

The site fails to build or start without it, rather than serving errors to users.

## Customization

### Brand Colors

Edit `tailwind.config.ts` to change colors:

```typescript
colors: {
  'brand-off-white': '#F6EFE9',
  'brand-black': '#000000',
  'brand-tan': '#B8A481',
  // ... etc
}
```

### Typography

Fonts configured in `app/layout.tsx`. Global styles in `app/globals.css`.

### Ship Animation

Replace `public/images/ship-hero.svg` with your custom ship illustration.

## Project Structure

```
app/                  # Next.js pages
  layout.tsx          # Root layout with fonts
  page.tsx            # Homepage
  archive/page.tsx    # Archive listing
  [slug]/page.tsx     # Dynamic reading pages
components/           # React components
  Header.tsx
  FloatingNav.tsx
  WaveTexture.tsx
  ShipHero.tsx
lib/
  content.ts          # Markdown parsing
  types.ts            # TypeScript interfaces
public/
  images/             # Static assets
  waves/              # SVG textures
content/              # Markdown files (published content)
obsidian-plugin/      # Publishing plugin
docs/                 # Design specs and plans
```

## License

MIT

---

Built with care. Designed for reading.
