# LiqTheNit app

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/dobe4evers-projects/v0-liq-the-nit-app)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/pSiGIit0KmY)

## Overview

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## Deployment

Your project is live at:

**[https://vercel.com/dobe4evers-projects/v0-liq-the-nit-app](https://vercel.com/dobe4evers-projects/v0-liq-the-nit-app)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/pSiGIit0KmY](https://v0.dev/chat/projects/pSiGIit0KmY)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

```
(
 echo "# Codebase Dump"
 # Add . at the start of paths if running from project root
 for file in \
 'src/actions/auth.ts' \
 'src/actions/game.ts' \
 'src/actions/profile.ts' \
 'src/app/(app)/analytics/page.tsx' 
 # Add any other root config files if needed
 do
   # Check if file exists before trying to cat it
   if [ -f "$file" ]; then
     echo -e "\n### $file"
     # Determine language for syntax highlighting based on extension
     lang="${file##*.}"
     if [ "$lang" = "css" ]; then lang="css";
     elif [ "$lang" = "mjs" ]; then lang="javascript"; # or js
     elif [ "$lang" = "json" ]; then lang="json";
     elif [ "$lang" = "ts" ]; then lang="ts";
     elif [ "$lang" = "tsx" ]; then lang="tsx";
     else lang=""; fi # Default to no language if unknown
 
     echo "\`\`\`${lang}"
     cat "$file"
     echo ''
     echo '\`\`\`'
   else
     echo -e "\n### WARNING: $file not found"
   fi
 done
) > codebase2.md

```

```
.
├── node_modules/
├── public/
├── src
│   ├── actions
│   │   ├── auth.ts
│   │   ├── games.ts
│   │   └── profiles.ts
│   ├── app
│   │   ├── (app)
│   │   │   ├── analytics
│   │   │   │   └── page.tsx
│   │   │   ├── history
│   │   │   │   └── page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── (auth)
│   │   │   └── auth
│   │   │       ├── callback
│   │   │       │   └── route.ts
│   │   │       └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── supabase
│   │       ├── admin.ts
│   │       ├── client.ts
│   │       └── server.ts
│   ├── auth
│   │   ├── client.ts
│   │   └── server.ts
│   ├── components
│   │   ├── analytics
│   │   │   ├── hours-chart.tsx
│   │   │   ├── performance-chart.tsx
│   │   │   └── profit-chart.tsx
│   │   ├── auth
│   │   │   └── auth-form.tsx
│   │   ├── history
│   │   │   ├── bitcoin-price-display.tsx
│   │   │   ├── games-table.tsx
│   │   │   └── week-stats.tsx
│   │   ├── layout
│   │   │   ├── nav-user.tsx
│   │   │   ├── nav.tsx
│   │   │   └── theme-switch.tsx
│   │   ├── logo.tsx
│   │   ├── start
│   │   │   ├── active-games.tsx
│   │   │   └── game-form.tsx
│   │   ├── theme-provider.tsx
│   │   └── ui/
│   ├── hooks
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib
│   │   ├── date.ts
│   │   ├── num.ts
│   │   └── utils.ts
│   ├── services
│   │   └── btc.ts
│   └── types
│       └── db.ts
└── tsconfig.json
```