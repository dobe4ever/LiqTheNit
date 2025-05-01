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


# Command to generate codebase dump:

```
(
echo "# Codebase Dump"
for file in \
'app/(app)/analytics/page.tsx' \
'app/(app)/history/page.tsx' \
'app/(app)/layout.tsx' \
'app/(app)/page.tsx' \
'app/(auth)/auth/callback/route.ts' \
'app/(auth)/auth/page.tsx' \
app/layout.tsx \
components/analytics/hours-chart.tsx \
components/analytics/performance-chart.tsx \
components/analytics/profit-chart.tsx \
components/auth/auth-form.tsx \
components/history/bitcoin-price-display.tsx \
components/history/games-table.tsx \
components/history/week-stats.tsx \
components/layout/navbar.tsx \
components/layout/switch-theme.tsx \
components/start/active-games-list.tsx \
components/start/game-form.tsx \
components/start/session-controller.tsx \
components/nav-user.tsx \
components/theme-provider.tsx \
lib/services/bitcoin-price.ts \
lib/supabase/admin.ts \
lib/supabase/client.ts \
lib/supabase/server.ts \
lib/utils/date-formatter.ts \
lib/utils/number-formatter.ts \
lib/utils.ts
do
  echo -e "\n### $file"
  echo '```ts'
  cat "$file"
  echo ''
  echo '```'
done
) > codebase.md

```
