# Chatter - Premium Real-time Web Chat

### 🔗 **[Live Demo](https://chat-me-tau-rosy.vercel.app/)** | 🚀 **Portfolio Showcase**

Chatter is a high-performance, real-time chat application built to demonstrate advanced frontend engineering capabilities. Designed from the ground up to solve complex UI/UX challenges, this project highlights expertise in core modern web development paradigms.

## 🎯 Engineering Focus

This application was engineered specifically to showcase proficiency in the following areas:

- **Realtime Architecture**: Implementing sub-millisecond bidirectional communication via WebSockets (Supabase Channels) for live messaging and presence.
- **Async Thinking**: Managing optimistic UI updates, debounced typing indicators, and complex loading states across multiple independent components.
- **Event-driven State**: Handling external database mutations and presence syncs seamlessly within React's render cycle using custom hooks and effect cleanup.
- **Proper Separation of Concerns**: Clean isolation of UI components (Tailwind CSS variables, dynamic class merging) from data-fetching logic and real-time listeners.
- **Design System Implementation**: Building a custom, glassmorphic UI using Tailwind CSS 4 without relying on pre-built component libraries.

---

## 🚀 Key Features

- **Live Chat Rooms**: Users can create new channels and switch between them instantly.
- **Presence Tracking**: Accurate "Active Now" user lists and real-time typing indicators.
- **Smart Auto-scroll**: Detects when users are reading old messages vs. actively participating, providing a notification to scroll down.
- **Premium UX**: Liquid-smooth CSS transitions, micro-interactions, and responsive design across all devices.

---

## 🛡️ Security Implementation

Security is a first-class citizen in this application. It implements modern security protocols to ensure user data integrity and protection:

### XSS (Cross-Site Scripting) Prevention
We use `DOMPurify` to rigorously sanitize all user-generated content before rendering. This prevents malicious scripts from being injected via chat messages.
```typescript
const cleanContent = DOMPurify.sanitize(msg.content);
```

### Input Sanitization & Data Integrity
In addition to client-side sanitization, the application leverages Supabase **Row Level Security (RLS)**. This is a crucial database-level safeguard ensuring users can only insert or modify data they own, regardless of frontend bypass attempts.

### Proper Token Storage
Authentication tokens are managed entirely via **HttpOnly cookies** using `@supabase/ssr`. By moving session resolution to Next.js Edge Middleware, we completely prevent client-side JavaScript access to sensitive session tokens.

### 🔒 Content Security Policy (CSP) Headers

A robust CSP is critical for modern web apps. It dictates to the browser exactly which sources of content (scripts, styles, images) are trusted.

**Example CSP Configuration:**
```js
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://*.supabase.co;
    font-src 'self';
    object-src 'none';
    connect-src 'self' https://*.supabase.co wss://*.supabase.co;
`;
```

**Why these directives?**
- `connect-src`: Essential for Supabase Realtime (WebSockets) and API calls.
- `img-src`: Allows loading user avatar images from external secure buckets.
- Strict `default-src 'self'` prevents unauthorized cross-origin requests.

---

## 🛠️ Tech Stack architecture

- **Framework**: Next.js 15+ (App Router, Edge Middleware)
- **Database/Auth**: Supabase (PostgreSQL, Auth, Realtime)
- **Styling**: Tailwind CSS v4 (Custom Tokens, Glassmorphism)
- **State Management**: React (`useState`, `useEffect`, `useRef`) + Supabase Subscriptions
- **Utilities**: `lucide-react` (Icons), `date-fns` (Time formatting), `clsx`/`tailwind-merge` (Dynamic styling)

## 🚦 Local Setup

1. Clone the repository.
2. Run `npm install`.
3. Create a `.env.local` containing your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Run the SQL schema found in `supabase/schema.sql` against your Supabase project.
5. Run `npm run dev`.
