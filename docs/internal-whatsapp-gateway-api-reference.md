# WhatsApp Gateway API Reference

## Overview

This WhatsApp Gateway is a REST API microservice that enables:
- **Outbound**: Send WhatsApp messages via HTTP POST requests
- **Inbound**: Receive WhatsApp messages via webhook callbacks

The gateway manages WhatsApp Web sessions using the Baileys library and persists authentication state in PostgreSQL (Supabase).

---

## Base URL

```
Use the env: INTERNAL_WHATSAPP_GATEWAY_URL
```

---

## Authentication

All endpoints except `/health` require Bearer token authentication.

**Header:**
```
Authorization: Bearer <API_SECRET>
Use the env: INTERNAL_WHATSAPP_GATEWAY_API_SECRET
```

**Error Responses:**

| Status | Error | Description |
|--------|-------|-------------|
| 401 | Unauthorized | Missing authorization header |
| 403 | Forbidden | Invalid API token |

---

## Endpoints

### Health Check

Check if the gateway is running.

```
GET /health
```

**Authentication:** None required

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### Initialize Session

Create a new WhatsApp session or reconnect an existing one. Returns a QR code for authentication if the session is new or expired.

```
POST /sessions/init
```

**Request Body:**
```json
{
  "sessionId": "string"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| sessionId | string | Yes | 1-64 chars, alphanumeric with `_` and `-` only |

**Response (200 OK):**
```json
{
  "sessionId": "my-session-01",
  "status": "qr",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| sessionId | string | The session identifier |
| status | string | One of: `disconnected`, `connecting`, `qr`, `connected` |
| qrCode | string \| null | Base64 data URL of QR code (only when status is `qr`) |

**Status Values:**

| Status | Description |
|--------|-------------|
| `disconnected` | Session is not connected |
| `connecting` | Connection in progress |
| `qr` | QR code ready for scanning |
| `connected` | Session is authenticated and ready |

**Error Response (400):**
```json
{
  "error": "Validation Error",
  "message": "sessionId must contain only alphanumeric characters, underscores, and hyphens"
}
```

---

### Get Session Status

Retrieve the current status of a session.

```
GET /sessions/:sessionId
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| sessionId | string | The session identifier |

**Response (200 OK):**
```json
{
  "sessionId": "my-session-01",
  "status": "connected",
  "qrCode": null,
  "lastConnected": "2024-01-15T10:30:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| sessionId | string | The session identifier |
| status | string | Current connection status |
| qrCode | string \| null | QR code if status is `qr`, otherwise null |
| lastConnected | string \| null | ISO timestamp of last successful connection |

**Error Response (404):**
```json
{
  "error": "Not Found",
  "message": "Session 'my-session-01' not found"
}
```

---

### Delete Session

Disconnect and remove a WhatsApp session. This logs out of WhatsApp Web and deletes all stored credentials.

```
DELETE /sessions/:sessionId
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| sessionId | string | The session identifier |

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Session 'my-session-01' deleted successfully"
}
```

**Error Response (404):**
```json
{
  "error": "Not Found",
  "message": "Session 'my-session-01' not found"
}
```

---

### Send Message

Send a text message to a WhatsApp number.

```
POST /messages/send
```

**Request Body:**
```json
{
  "sessionId": "my-session-01",
  "to": "5511999999999",
  "message": "Hello from the gateway!"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| sessionId | string | Yes | Must be an active, connected session |
| to | string | Yes | 10-20 digits, phone number with country code, no symbols |
| message | string | Yes | 1-4096 characters |

**Phone Number Format:**
- Include country code (e.g., `55` for Brazil, `1` for USA)
- No `+`, spaces, or dashes
- Examples: `5511999999999`, `14155551234`

**Response (200 OK):**
```json
{
  "success": true,
  "messageId": "3EB0B430A7C9D2F17E92"
}
```

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Whether the message was sent |
| messageId | string | WhatsApp message ID for tracking |

**Error Response (400):**
```json
{
  "error": "Bad Request",
  "message": "Session 'my-session-01' is not connected"
}
```

---

## Webhooks

The gateway sends HTTP POST requests to your configured `WEBHOOK_URL` when messages are received.

### Message Received Event

**Webhook Payload:**
```json
{
  "event": "message.received",
  "sessionId": "my-session-01",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "data": {
    "messageId": "3EB0B430A7C9D2F17E93",
    "from": "5511999999999",
    "pushName": "John Doe",
    "timestamp": 1705315200,
    "type": "text",
    "text": "Hello!"
  }
}
```

**Payload Schema:**

| Field | Type | Description |
|-------|------|-------------|
| event | string | Always `message.received` |
| sessionId | string | The session that received the message |
| timestamp | string | ISO timestamp when webhook was dispatched |
| data | object | The message data (see below) |

**Message Data Schema:**

| Field | Type | Description |
|-------|------|-------------|
| messageId | string | Unique message identifier |
| from | string | Sender's phone number (without @s.whatsapp.net) |
| pushName | string \| null | Sender's WhatsApp display name |
| timestamp | number | Unix timestamp (seconds) when message was sent |
| type | string | Message type (see below) |
| text | string \| undefined | Text content (for text messages or media captions) |
| media | object \| undefined | Media information (for media messages) |

**Message Types:**

| Type | Description |
|------|-------------|
| `text` | Plain text message |
| `image` | Image with optional caption |
| `video` | Video with optional caption |
| `audio` | Voice message or audio file |
| `document` | Document/file attachment |
| `sticker` | Sticker |
| `unknown` | Unsupported message type |

**Media Object Schema:**

| Field | Type | Description |
|-------|------|-------------|
| mimeType | string | MIME type (e.g., `image/jpeg`, `video/mp4`) |
| fileName | string \| undefined | Original filename (for documents) |
| url | string | Public URL to download the media from Supabase Storage |
| caption | string \| undefined | Media caption if provided |

**Example - Image Message:**
```json
{
  "event": "message.received",
  "sessionId": "my-session-01",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "data": {
    "messageId": "3EB0B430A7C9D2F17E94",
    "from": "5511999999999",
    "pushName": "John Doe",
    "timestamp": 1705315200,
    "type": "image",
    "text": "Check this out!",
    "media": {
      "mimeType": "image/jpeg",
      "url": "https://xxx.supabase.co/storage/v1/object/public/whatsapp-media/my-session-01/3EB0B430A7C9D2F17E94.jpg",
      "caption": "Check this out!"
    }
  }
}
```

**Example - Document Message:**
```json
{
  "event": "message.received",
  "sessionId": "my-session-01",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "data": {
    "messageId": "3EB0B430A7C9D2F17E95",
    "from": "5511999999999",
    "pushName": "John Doe",
    "timestamp": 1705315200,
    "type": "document",
    "media": {
      "mimeType": "application/pdf",
      "fileName": "report.pdf",
      "url": "https://xxx.supabase.co/storage/v1/object/public/whatsapp-media/my-session-01/3EB0B430A7C9D2F17E95_report.pdf.pdf"
    }
  }
}
```

### Webhook Response

Your webhook endpoint should return a `2xx` status code to acknowledge receipt. The gateway does not retry failed webhooks.

---

## Integration Flow

### 1. Initial Connection

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Client    │         │   Gateway   │         │  WhatsApp   │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │  POST /sessions/init  │                       │
       │  {sessionId: "x"}     │                       │
       │──────────────────────>│                       │
       │                       │   Connect WebSocket   │
       │                       │──────────────────────>│
       │                       │                       │
       │                       │   QR Code Data        │
       │                       │<──────────────────────│
       │  {status: "qr",       │                       │
       │   qrCode: "data:..."}│                       │
       │<──────────────────────│                       │
       │                       │                       │
       │  Display QR to user   │                       │
       │  User scans with phone│                       │
       │                       │                       │
       │                       │   Auth Success        │
       │                       │<──────────────────────│
       │                       │                       │
```

### 2. Polling for Connection Status

After displaying the QR code, poll the session status until connected:

```
┌─────────────┐         ┌─────────────┐
│   Client    │         │   Gateway   │
└──────┬──────┘         └──────┬──────┘
       │                       │
       │ GET /sessions/x       │
       │──────────────────────>│
       │ {status: "qr"}        │
       │<──────────────────────│
       │                       │
       │  ... wait 2-3 sec ... │
       │                       │
       │ GET /sessions/x       │
       │──────────────────────>│
       │ {status: "connected"} │
       │<──────────────────────│
       │                       │
       │  Ready to send msgs!  │
       │                       │
```

**Recommended polling interval:** 2-3 seconds

### 3. Sending Messages

Once connected, send messages via the API:

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Client    │         │   Gateway   │         │  WhatsApp   │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │  POST /messages/send  │                       │
       │  {sessionId, to, msg} │                       │
       │──────────────────────>│                       │
       │                       │   Send Message        │
       │                       │──────────────────────>│
       │                       │                       │
       │                       │   Delivery ACK        │
       │                       │<──────────────────────│
       │  {success: true,      │                       │
       │   messageId: "xxx"}   │                       │
       │<──────────────────────│                       │
       │                       │                       │
```

### 4. Receiving Messages

Incoming messages are pushed to your webhook:

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  WhatsApp   │         │   Gateway   │         │ Your Server │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │   New Message         │                       │
       │──────────────────────>│                       │
       │                       │                       │
       │                       │  POST /your-webhook   │
       │                       │  {event, sessionId,   │
       │                       │   data: {...}}        │
       │                       │──────────────────────>│
       │                       │                       │
       │                       │   200 OK              │
       │                       │<──────────────────────│
       │                       │                       │
```

### 5. Session Persistence

Sessions are persisted in the database. If the gateway restarts:

1. Call `POST /sessions/init` with the same `sessionId`
2. If credentials are still valid, status will be `connected` (no QR needed)
3. If credentials expired, a new QR code will be generated

---

## Message History

**Important:** The gateway does NOT sync or provide access to message history. It only:
- Forwards new incoming messages (received after connection) via webhooks
- Filters out messages older than 90 days to avoid processing historical data on reconnection

If you need message history, you must store webhook payloads in your own database.

---

## Error Handling

All error responses follow this format:

```json
{
  "error": "Error Type",
  "message": "Human-readable description"
}
```

**Common Errors:**

| Status | Error | Cause |
|--------|-------|-------|
| 400 | Validation Error | Invalid request body or parameters |
| 400 | Bad Request | Session not connected or other business logic error |
| 401 | Unauthorized | Missing Authorization header |
| 403 | Forbidden | Invalid API token |
| 404 | Not Found | Session does not exist |
| 500 | Internal Server Error | Unexpected server error |

---

## Rate Limits

The gateway does not enforce rate limits, but WhatsApp may temporarily block numbers that send too many messages. Recommended limits:
- **New conversations:** Max 50/day for new numbers
- **Existing conversations:** Max 1 message/second

---

## Code Examples

### Initialize and Connect (Node.js)

```javascript
const API_URL = 'https://your-gateway.com';
const API_SECRET = 'your-api-secret';

async function connectWhatsApp(sessionId) {
  // 1. Initialize session
  const initRes = await fetch(`${API_URL}/sessions/init`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId }),
  });

  const initData = await initRes.json();

  if (initData.status === 'connected') {
    console.log('Already connected!');
    return true;
  }

  if (initData.status === 'qr') {
    console.log('Scan this QR code:', initData.qrCode);
    // Display QR code to user (it's a data:image/png;base64,... URL)
  }

  // 2. Poll for connection
  while (true) {
    await new Promise(r => setTimeout(r, 3000));

    const statusRes = await fetch(`${API_URL}/sessions/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${API_SECRET}` },
    });

    const statusData = await statusRes.json();

    if (statusData.status === 'connected') {
      console.log('Connected!');
      return true;
    }

    if (statusData.status === 'qr' && statusData.qrCode) {
      console.log('New QR code:', statusData.qrCode);
    }
  }
}
```

### Send Message (Node.js)

```javascript
async function sendMessage(sessionId, to, message) {
  const res = await fetch(`${API_URL}/messages/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId, to, message }),
  });

  const data = await res.json();

  if (data.success) {
    console.log('Message sent:', data.messageId);
  } else {
    console.error('Failed:', data.message);
  }

  return data;
}

// Usage
await sendMessage('my-session', '5511999999999', 'Hello from Node.js!');
```

### Webhook Handler (Express.js)

```javascript
app.post('/webhook/whatsapp', (req, res) => {
  const { event, sessionId, data } = req.body;

  if (event === 'message.received') {
    console.log(`[${sessionId}] Message from ${data.from}: ${data.text || '[media]'}`);

    // Handle different message types
    switch (data.type) {
      case 'text':
        handleTextMessage(sessionId, data);
        break;
      case 'image':
      case 'video':
      case 'document':
        handleMediaMessage(sessionId, data);
        break;
    }
  }

  res.sendStatus(200);
});
```

### cURL Examples

```bash
# Health check
curl https://your-gateway.com/health

# Initialize session
curl -X POST https://your-gateway.com/sessions/init \
  -H "Authorization: Bearer YOUR_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "my-session"}'

# Get session status
curl https://your-gateway.com/sessions/my-session \
  -H "Authorization: Bearer YOUR_API_SECRET"

# Send message
curl -X POST https://your-gateway.com/messages/send \
  -H "Authorization: Bearer YOUR_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "my-session", "to": "5511999999999", "message": "Hello!"}'

# Delete session
curl -X DELETE https://your-gateway.com/sessions/my-session \
  -H "Authorization: Bearer YOUR_API_SECRET"
```

---

## TypeScript Types

For TypeScript integrations, here are the relevant types:

```typescript
type ConnectionStatus = 'disconnected' | 'connecting' | 'qr' | 'connected';
type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'unknown';

interface InitSessionRequest {
  sessionId: string;
}

interface InitSessionResponse {
  sessionId: string;
  status: ConnectionStatus;
  qrCode: string | null;
}

interface SessionInfo {
  sessionId: string;
  status: ConnectionStatus;
  qrCode: string | null;
  lastConnected: string | null;
}

interface SendMessageRequest {
  sessionId: string;
  to: string;
  message: string;
}

interface SendMessageResponse {
  success: boolean;
  messageId?: string;
}

interface MediaInfo {
  mimeType: string;
  fileName?: string;
  url: string;
  caption?: string;
}

interface InboundMessage {
  messageId: string;
  from: string;
  pushName: string | null;
  timestamp: number;
  type: MessageType;
  text?: string;
  media?: MediaInfo;
}

interface WebhookPayload {
  event: 'message.received';
  sessionId: string;
  timestamp: string;
  data: InboundMessage;
}

interface ApiError {
  error: string;
  message: string;
}
```
