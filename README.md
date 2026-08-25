# Storyboard Shot Builder v3.6.1

Base: v3.6 Collaboration Workspace.

Changes in this build:
- Unread chat count appears beside `Collaborate · Chat` and beside the `Chat Room` tab.
- Unread count increases in realtime while the project is open.
- If an unread message contains the current user's `@username`, an `@` marker appears beside the unread count.
- Added a Mention dropdown in chat so collaborators can insert an exact `@username`.
- Mentions are highlighted inside chat messages.
- Opening the Chat Room marks current messages as read.
- Read state is stored per user + project in browser localStorage, so it survives refresh/reopen on the same browser.
- No new Supabase SQL is required for this version.

The v3.6 base remains unchanged; this is a separate build.
