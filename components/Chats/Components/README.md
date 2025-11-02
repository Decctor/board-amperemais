# ChatHub - Composable Chat Interface

A beautiful, accessible, and highly composable chat interface built with React and TypeScript. This component follows modern composition patterns to provide maximum flexibility while maintaining a clean and intuitive API.

## 🎯 Overview

The ChatHub component is built using the **composition pattern**, allowing you to build complex chat interfaces by combining smaller, focused components. This approach provides:

- ✨ **Beautiful UI** - Modern, polished design with smooth animations
- 📱 **Responsive** - Works seamlessly on mobile and desktop
- ♿ **Accessible** - ARIA labels, keyboard navigation, and screen reader support
- 🎨 **Customizable** - Style and extend each component independently
- 🧩 **Composable** - Mix and match components to fit your needs
- 🔒 **Type-safe** - Full TypeScript support with inference

## 📦 Installation

The ChatHub components are already part of your project. Simply import them:

```tsx
import * as ChatHub from "@/components/identificador/chats/ChatHub";
```

## 🏗️ Architecture

The ChatHub follows a composable architecture with these core components:

```
ChatHub.Root          → Container with shared state (Context Provider)
├── ChatHub.Layout    → Responsive layout manager (desktop/mobile)
│   ├── listPanel     → Left panel (chat list)
│   │   ├── ChatHub.Header  → Phone selector & actions
│   │   └── ChatHub.List    → Chat list with items
│   └── contentPanel  → Right panel (active chat)
│       └── ChatHub.Content → Chat content wrapper
│           ├── ChatHub.Messages → Message display area
│           └── ChatHub.Input    → Message input area
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| `Root` | State management, context provider |
| `Layout` | Responsive layout (desktop 2-column, mobile sliding) |
| `Header` | Phone number selector, new chat button |
| `List` | Display chat list with unread badges |
| `Content` | Active chat container with header |
| `Messages` | Scrollable message list with status indicators |
| `Input` | Message composition with templates and file upload |

## 🚀 Quick Start

### Basic Usage

```tsx
import * as ChatHub from "@/components/identificador/chats/ChatHub";

function MyChatsPage({ session, whatsappConnection }) {
  return (
    <ChatHub.Root
      session={session}
      userHasMessageSendingPermission={true}
      whatsappConnection={whatsappConnection}
    >
      <ChatHub.Layout
        listPanel={
          <>
            <ChatHub.Header onNewChat={() => console.log("New chat")} />
            <ChatHub.List />
          </>
        }
        contentPanel={
          <>
            <ChatHub.Content>
              <ChatHub.Messages />
              <ChatHub.Input />
            </ChatHub.Content>
          </>
        }
      />
    </ChatHub.Root>
  );
}
```

### Advanced Usage

You can customize and extend each component:

```tsx
<ChatHub.Root
  session={session}
  userHasMessageSendingPermission={true}
  whatsappConnection={whatsappConnection}
  defaultPhoneNumber="+5511999999999"
>
  <ChatHub.Layout
    listPanel={
      <>
        {/* Custom header with additional actions */}
        <ChatHub.Header 
          onNewChat={handleNewChat}
          className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"
        >
          <Button onClick={handleSettings}>
            <Settings className="w-4 h-4" />
          </Button>
        </ChatHub.Header>

        {/* Chat list with custom callback */}
        <ChatHub.List 
          onChatSelect={(chatId) => {
            console.log("Chat selected:", chatId);
            trackAnalytics("chat_opened", { chatId });
          }}
        />
      </>
    }
    contentPanel={
      <>
        <ChatHub.Content
          emptyState={
            <div className="text-center p-8">
              <h3>No chat selected</h3>
              <p>Choose a conversation to get started</p>
            </div>
          }
        >
          {/* Messages with custom empty state */}
          <ChatHub.Messages 
            emptyState={
              <div className="text-center">
                <p>Start a conversation!</p>
              </div>
            }
          />

          {/* Input with custom placeholder and callback */}
          <ChatHub.Input 
            placeholder="Type your message here..."
            maxRows={6}
            onMessageSent={() => {
              playNotificationSound();
              trackAnalytics("message_sent");
            }}
          />
        </ChatHub.Content>
      </>
    }
  />
</ChatHub.Root>
```

## 📚 API Reference

### ChatHub.Root

The root component that provides context to all child components.

**Props:**

```typescript
{
  children: ReactNode;
  session: TAuthSession;                    // User session
  userHasMessageSendingPermission: boolean; // Can user send messages?
  whatsappConnection: WhatsAppConnection;   // WhatsApp connection data
  className?: string;                       // Custom styles
  defaultPhoneNumber?: string;              // Initial phone number
}
```

### ChatHub.Layout

Manages responsive layout (desktop 2-column, mobile sliding panels).

**Props:**

```typescript
{
  listPanel: ReactNode;    // Left panel content (chat list)
  contentPanel: ReactNode; // Right panel content (active chat)
  className?: string;      // Custom styles
}
```

### ChatHub.Header

Header with phone selector and actions.

**Props:**

```typescript
{
  children?: ReactNode;        // Additional actions/buttons
  className?: string;          // Custom styles
  showPhoneSelector?: boolean; // Show phone dropdown (default: true)
  onNewChat?: () => void;      // Callback for new chat button
}
```

### ChatHub.List

Displays list of chats with unread badges.

**Props:**

```typescript
{
  className?: string;                   // Custom styles
  onChatSelect?: (chatId: string) => void; // Callback when chat selected
}
```

### ChatHub.Content

Container for active chat (header + messages + input).

**Props:**

```typescript
{
  children?: ReactNode;    // Messages and Input components
  className?: string;      // Custom styles
  emptyState?: ReactNode;  // Custom empty state when no chat selected
}
```

### ChatHub.Messages

Scrollable message list with status indicators.

**Props:**

```typescript
{
  className?: string;     // Custom styles
  emptyState?: ReactNode; // Custom empty state when no messages
}
```

### ChatHub.Input

Message composition area with file upload and templates.

**Props:**

```typescript
{
  className?: string;             // Custom styles
  placeholder?: string;           // Input placeholder text
  maxRows?: number;               // Max textarea rows (default: 4)
  onMessageSent?: () => void;     // Callback after message sent
}
```

## 🎨 Styling & Customization

### Using className

Every component accepts a `className` prop for custom styling:

```tsx
<ChatHub.Header className="bg-gradient-to-r from-purple-500 to-pink-500" />
<ChatHub.List className="bg-gray-50 dark:bg-gray-900" />
<ChatHub.Messages className="bg-pattern" />
```

### Custom Empty States

Provide custom empty states for better UX:

```tsx
<ChatHub.Content
  emptyState={
    <div className="flex flex-col items-center gap-4">
      <img src="/empty-chat.svg" alt="No chat" />
      <h3>Select a conversation</h3>
      <Button>Start New Chat</Button>
    </div>
  }
>
  <ChatHub.Messages
    emptyState={
      <div className="text-center">
        <p>No messages yet. Say hi! 👋</p>
      </div>
    }
  />
</ChatHub.Content>
```

### Extending Components

You can wrap components to add functionality:

```tsx
function MyCustomList() {
  const { selectedChatId } = ChatHub.useChatHub();
  
  return (
    <div className="relative">
      <ChatHub.List />
      {selectedChatId && (
        <div className="absolute top-0 right-0 m-2">
          <Badge>Active</Badge>
        </div>
      )}
    </div>
  );
}
```

## 🪝 Using the Context Hook

Access shared state from any child component:

```tsx
import { useChatHub } from "@/components/identificador/chats/ChatHub";

function MyCustomComponent() {
  const {
    selectedChatId,
    selectedPhoneNumber,
    session,
    isDesktop,
    userHasMessageSendingPermission,
    whatsappConnection,
    setSelectedChatId,
    setSelectedPhoneNumber,
  } = useChatHub();

  return (
    <div>
      <p>Current Chat: {selectedChatId}</p>
      <p>Phone: {selectedPhoneNumber}</p>
      <p>Desktop: {isDesktop ? "Yes" : "No"}</p>
    </div>
  );
}
```

## 🎯 Features

### Desktop Layout
- **Two-column layout** - Chat list on left, active chat on right
- **Persistent visibility** - Both panels always visible
- **Resizable** - Smooth transitions and hover states

### Mobile Layout
- **Sliding panels** - Smooth slide animations between list and chat
- **Automatic navigation** - Back button appears when chat is active
- **Touch-optimized** - Swipe-friendly interactions

### Message Display
- **Grouped messages** - Messages from same sender grouped together
- **Status indicators** - Pending, sent, delivered, failed states
- **Media support** - Images and documents with previews
- **Timestamps** - Smart timestamp display (only on last message in group)
- **Smooth scrolling** - Auto-scroll to bottom with manual override

### Input Features
- **Auto-resize textarea** - Grows with content up to max rows
- **File upload** - Images and documents
- **Template support** - WhatsApp approved templates
- **Expired conversation handling** - Visual warning with template requirement
- **Keyboard shortcuts** - Enter to send, Shift+Enter for new line
- **Loading states** - Visual feedback during send

### Accessibility
- **ARIA labels** - Proper labels for screen readers
- **Keyboard navigation** - Full keyboard support
- **Focus management** - Logical focus flow
- **Status announcements** - Live regions for dynamic content

## 🔧 Troubleshooting

### Context Error

**Error:** `useChatHub must be used within a ChatHub.Root component`

**Solution:** Make sure your component is inside `<ChatHub.Root>`:

```tsx
<ChatHub.Root {...props}>
  <YourComponent /> {/* ✅ Can use useChatHub() */}
</ChatHub.Root>
<YourComponent /> {/* ❌ Cannot use useChatHub() */}
```

### Messages Not Updating

If messages don't update in real-time, check:
1. Convex subscriptions are active
2. `selectedChatId` is correctly set
3. No errors in console

### Mobile Layout Not Working

Ensure the media query breakpoint matches your design:
- Default breakpoint: `1024px` (lg)
- Customize in `Root.tsx` if needed

## 📖 Examples

### Example 1: Simple Implementation

```tsx
export default function SimpleChat({ session, connection }) {
  return (
    <ChatHub.Root
      session={session}
      userHasMessageSendingPermission={true}
      whatsappConnection={connection}
    >
      <ChatHub.Layout
        listPanel={
          <>
            <ChatHub.Header onNewChat={() => alert("New chat")} />
            <ChatHub.List />
          </>
        }
        contentPanel={
          <ChatHub.Content>
            <ChatHub.Messages />
            <ChatHub.Input />
          </ChatHub.Content>
        }
      />
    </ChatHub.Root>
  );
}
```

### Example 2: With Custom Header

```tsx
function CustomHeader() {
  const { selectedPhoneNumber } = ChatHub.useChatHub();
  
  return (
    <ChatHub.Header onNewChat={handleNewChat}>
      <Badge>{selectedPhoneNumber ? "Online" : "Offline"}</Badge>
      <Button onClick={handleSettings}>Settings</Button>
    </ChatHub.Header>
  );
}
```

### Example 3: With Analytics

```tsx
function AnalyticsChat({ session, connection }) {
  const handleChatSelect = (chatId: string) => {
    analytics.track("chat_opened", { chatId });
  };

  const handleMessageSent = () => {
    analytics.track("message_sent");
  };

  return (
    <ChatHub.Root session={session} {...props}>
      <ChatHub.Layout
        listPanel={
          <>
            <ChatHub.Header />
            <ChatHub.List onChatSelect={handleChatSelect} />
          </>
        }
        contentPanel={
          <ChatHub.Content>
            <ChatHub.Messages />
            <ChatHub.Input onMessageSent={handleMessageSent} />
          </ChatHub.Content>
        }
      />
    </ChatHub.Root>
  );
}
```

## 🤝 Contributing

When adding new features:

1. Keep components focused on single responsibility
2. Use context for shared state
3. Provide `className` prop for styling
4. Include proper TypeScript types
5. Add accessibility attributes
6. Update this README

## 📝 License

Part of the app-ampere project.