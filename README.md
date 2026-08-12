# zfbauto — Facebook Page Auto-Post Bot

## Language and Coding Standards
- **Communication**: Always talk in Thai when interacting with users.
- **Code & Technical Assets**: All code, comments, documentation, and technical definitions must be in English.

> Full-featured Facebook page automation dashboard for ZeaZ Platform.

## Features

- **Dashboard** — KPI overview, quick post, mini activity feed
- **Compose** — Rich text + photo posts with live FB preview, file upload
- **Post Queue** — Add, manage, and publish queued posts on demand
- **Scheduler** — Cron-based auto-posting (default + custom schedules)
- **Page Feed** — View and delete live Facebook posts
- **History** — Local audit log of all publish actions
- **Settings** — Configure schedule, template, and queue behavior

## Quick Start

```bash
cp .env.example .env
# Fill in FACEBOOK_PAGE_ID and FACEBOOK_ACCESS_TOKEN in .env

npm install
npm run dev   # starts on http://localhost:5000
```

## Configuration

| Variable | Required | Description |
|---|---|---|
| `FACEBOOK_PAGE_ID` | ✅ | Facebook Page numeric ID |
| `FACEBOOK_ACCESS_TOKEN` | ✅ | Long-lived Page Access Token |
| `FB_API_VERSION` | Optional | Graph API version (default: v19.0) |
| `PORT` | Optional | Server port (default: 5000) |
| `NODE_ENV` | Optional | `development` or `production` |

## API Endpoints

### Facebook
| Method | Path | Description |
|---|---|---|
| POST | `/api/facebook/post-message` | Publish text post |
| POST | `/api/facebook/post-photo` | Publish photo (url or file upload) |
| GET | `/api/facebook/posts` | Get recent posts |
| DELETE | `/api/facebook/posts/:postId` | Delete a post |
| GET | `/api/facebook/insights` | Page stats (followers, fans) |
| GET | `/api/facebook/config` | Connection status |

### Queue
| Method | Path | Description |
|---|---|---|
| GET | `/api/queue` | List all queue items |
| POST | `/api/queue` | Add item to queue |
| DELETE | `/api/queue` | Clear entire queue |
| DELETE | `/api/queue/:id` | Remove specific item |
| POST | `/api/queue/:id/publish` | Immediately publish item |

### Scheduler
| Method | Path | Description |
|---|---|---|
| GET | `/api/schedules` | List custom schedules |
| POST | `/api/schedules` | Add custom schedule |
| PATCH | `/api/schedules/:id` | Update schedule |
| DELETE | `/api/schedules/:id` | Delete schedule |
| POST | `/api/scheduler/trigger` | Manual trigger |
| POST | `/api/scheduler/restart` | Restart with new cron |

### Other
| Method | Path | Description |
|---|---|---|
| GET | `/api/history` | Post history log |
| GET | `/api/settings` | Get settings |
| PATCH | `/api/settings` | Update settings |
| GET | `/health` | Health check |

## Architecture

```
apps/zfbauto/
├── src/
│   ├── server.js        # Express app, routes, multer
│   ├── fbController.js  # Facebook Graph API + Queue/Schedule/History handlers
│   ├── scheduler.js     # node-cron job manager
│   └── db.js            # In-memory + JSON persistence layer
├── public/
│   ├── index.html       # SPA shell (7 pages)
│   ├── css/style.css    # Dark theme, Outfit font, responsive
│   └── js/app.js        # Router, data loading, all page logic
├── data/
│   └── db.json          # Persisted queue, history, schedules, settings
├── .env.example
└── package.json
```

## Getting a Facebook Page Access Token

1. Go to [Meta Developer Portal](https://developers.facebook.com/)
2. Create an App → Add "Pages" product
3. Generate a Page Access Token for your page
4. For long-lived tokens: exchange via Graph API Explorer
5. Copy to `FACEBOOK_ACCESS_TOKEN` in `.env`

## Security

- Never commit `.env` to version control
- Use environment-specific tokens with minimal permissions
- Page Access Tokens should have `pages_manage_posts` permission
