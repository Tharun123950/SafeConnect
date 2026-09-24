# Walkthrough - Notification and Unread Message Indicator Refactoring

We have successfully refactored the notification storage, API endpoints, frontend navigation badges, and conversation card highlighting to route direct message events to real-time indicators instead of the Notifications page.

---

## 🛠️ Key Correctness Refactors

### 1. 📢 Simplified Notifications Tab
- Re-configured `GET /api/notifications` on the Express backend (`server.cjs`) to query and return only types `like`, `follow`, `AI_FLAGGED_MESSAGE`, and `ai_flagged`.
- Excluded normal chat notifications (`type = 'message'`) and comment notifications from the Notifications list and unread badges counts.
- Updated mockup filtering in `App.jsx` (`fetchNotifications`) to strictly filter by the same allowed list.

### 🔕 Disabled Direct Message Notifications
- Completely removed the direct message notification database creation block inside the backend send message endpoint (`POST /api/chats/message`). Direct message events no longer pollute the `Notification` database table.
- Cleaned up the mockup message notification creation inside the frontend `handleSendMessage` and helper bot `triggerAiAssistantReply` logic, ensuring no mock notification entries of type `'message'` are stored or fetched locally.

### 🔴 Real-Time Unread Message Indicators
- **Real-Time Sidebar Badge:** Added an unread badge overlaying the **Messages** sidebar icon. The unread count dynamically aggregates the unread message counts across all conversation partners (`inboxUsers.reduce((sum, chat) => sum + chat.unreadCount, 0)`).
- **Active Background Polling:** Refactored the client-side background polling effect to execute `fetchInbox()` unconditionally every 3 seconds, ensuring the navigation unread badge updates instantly when browsing other tabs (e.g., Home feed or Search page).
- **Inbox Card Highlighting:** Highlighted unread conversations in the chat thread list with a distinct overlay background (`rgba(0, 149, 246, 0.05)`), a left border line (`4px solid var(--ig-primary-button)`), bold font weights, and a beautiful count badge pill on the right (e.g., `3 New`).
- **Instant Read Reset:** Refactored the `fetchChatThread` click handler to mark partner messages as `read` (setting `status = 'read'` locally in mockup mode and calling the read endpoint on backend) and immediately execute `fetchInbox()` to reset badges and highlighting in real-time.

### 🗑️ Permanent AI Logs & Bulk Delete
- Added a **Delete All** button in the Notifications page header. Clicking it executes `DELETE /api/notifications` on the backend (or clears local storage in mockup mode), deleting all likes and follows while permanently preserving the AI abuse alerts (`AI_FLAGGED_MESSAGE` and `ai_flagged`).
- Disabled individual trash delete buttons next to AI flagged notification cards to prevent receivers from removing safety records.

### 🛡️ Sender/Receiver Distinct Notification Actions
- Exposed `messageSenderId` in the API notification mapping and client notifications list queries.
- Updated the warning banner inside `src/App.jsx` to render Allow and Report buttons only if the current user is the **receiver** of the flagged message (`n.messageSenderId !== currentUser.id`).
- Senders will only see their plain message notification `"Your message was flagged by AI."` without any buttons or warning banners, preventing unauthorized decision triggers.

### 🔒 Prevent Message Events from Incrementing Notification Badges
- Filtered socket events on the client side (`notificationCreated` in `src/App.jsx`) to ignore message notifications and avoid incrementing the notification count.
- Filtered backend unread notification count queries (`createAndEmitNotification` helper and `POST /api/chats/message`) to exclude message types, ensuring that direct message delivery updates only the Messages tab icon badge (chat symbol) and not the Notifications count.
- Enforced correct notification count filtering inside local storage background polling in `App.jsx` to avoid display sync lag.

### 📝 Masked Unread Message Previews (Sent Message Placeholder)
- Masked the preview text displayed under partner usernames in the inbox card list:
  - If a thread has unread messages, it displays `"sent message"` (if there is 1 unread message) or `"1+ messages"` (if there are more than 1).
  - Normal preview text (message body or `'Attachment image'`) is displayed only after the conversation is opened and read.

### 🚪 Mandatory Login Screen on Launch
- Refactored `jwtToken`, `isLoggedIn`, and `currentUser` initializations in `src/App.jsx`. The application no longer defaults to a logged-in state of `tharun_sai` on load.
- If there is no active session in `localStorage` (`ig_current_user`), the application defaults `isLoggedIn` to `false` and renders the mandatory Instagram Login/Registration page immediately upon launch.

### ⚡ Forced Active Live Backend Integration
- Overrode the automatic localhost detection parameter `USE_LIVE_BACKEND` to always evaluate to `true` in `src/App.jsx`, ensuring that both local and production clients strictly communicate with the running Express Node and FastAPI servers.

### 💽 Migrated Database from PostgreSQL to SQLite
- Since PostgreSQL was not installed locally on port `5432` on the Windows environment, direct calls to `prisma.user.findFirst()` encountered connection failures.
- Successfully migrated the database layer from PostgreSQL to **SQLite** (a built-in database model):
  - Configured `DATABASE_URL="file:./dev.db"` inside `.env`.
  - Changed the schema datasource provider to `sqlite` inside `prisma/schema.prisma`.
  - Ran `prisma db push` to synchronize table structures and generate the local Prisma Client.
  - Executed the Prisma seed script to populate `dev.db` with all default users, posts, comments, follows, and chat messages.
- The Express server now operates cleanly and reliably on the SQLite engine without any service daemon dependencies.

---

## 🚀 Execution Verification
- Compiled the Vite production build cleanly with zero errors/warnings.
- Started the FastAPI prediction server at `http://localhost:8000/predict`.
- Started the Express API / Socket.IO server at `http://localhost:5000`.
- Started the Vite dev server at `http://localhost:5173`.
