# Chatter - Premium Real-time Chat Application

Chatter is a high-performance, real-time chat application built with Next.js, Supabase, and Tailwind 4. It demonstrates advanced frontend engineering skills including event-driven state, real-time presence, and security best practices.

## 🚀 Features

- **Real-time Messaging**: Sub-millisecond message delivery via Supabase Postgres Changes.
- **Presence Tracking**: Real-time "Who's Online" and "Typing..." indicators.
- **Responsive Layout**: Premium glassmorphic design optimized for all screen sizes.
- **Authentication**: Secure Login/Signup with protected routes using Next.js Middleware.
- **Auto-scroll**: Smart scroll-to-bottom behavior with "New Message" indicator.

## 🛡️ Security Implementation

This project follows strict security protocols to ensure user data integrity and protection:

### XSS (Cross-Site Scripting) Prevention
We use `DOMPurify` to sanitize all user-generated content before rendering. This prevents malicious scripts from being injected via chat messages.
```typescript
const cleanContent = DOMPurify.sanitize(msg.content);
```

### Input Sanitization
In addition to client-side sanitization, we leverage Supabase **Row Level Security (RLS)** to ensure users can only insert or modify data they own.

### Proper Token Storage
Authentication tokens are managed as secure, HttpOnly cookies via `@supabase/ssr`, preventing client-side script access to session tokens.

### 🔒 Content Security Policy (CSP) Headers

A robust CSP is critical for modern web apps. It tells the browser which sources of content (scripts, styles, images) are trusted.

In a production environment, you should configure CSP headers in `next.config.js` or through your hosting provider (e.g., Vercel).

**Example CSP Configuration:**
```js
const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://*.supabase.co;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
    connect-src 'self' https://*.supabase.co wss://*.supabase.co;
`;
```

**Why these directives?**
- `default-src 'self'`: Restricts everything to the same origin by default.
- `connect-src`: Essential for Supabase Realtime (WebSockets) and API calls.
- `img-src`: Allows images from the Supabase bucket for avatars.
- `script-src 'unsafe-inline'`: Required for Next.js to function correctly (though in strict CSPs, nonces are preferred).

## 🛠️ Architecture

- **State Management**: React `useState` and `useEffect` combined with Supabase Realtime subscriptions.
- **Styling**: Tailwind CSS 4 with CSS-native variables for a premium look.
- **Icons**: Lucide React.
- **Realtime**: Supabase Presence (for typing/online status) and Channels (for messages).

## 🚦 Getting Started

1. Clone the repo.
2. Run `npm install`.
3. Create a `.env.local` with your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Run `npm run dev`.
