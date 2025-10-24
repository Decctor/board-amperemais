# AI Customer Service Agent - Implementation Guide

## Overview

This AI agent is a high-agency customer service and sales assistant built for the Ampère Mais WhatsApp integration. It uses GPT-4 with tool calling capabilities to provide intelligent, context-aware customer service.

## Features

### 1. Customer Intelligence
- **Purchase History Analysis**: Access to complete customer purchase history with filtering
- **RFM Analysis**: Leverages Recency, Frequency, Monetary analysis to personalize interactions
- **Customer Insights**: Calculates aggregate statistics, favorite products, and spending patterns
- **Recent Purchases**: Quick access to recent transactions for context

### 2. Product Catalog Access
- **Product Search**: Full-text search across product descriptions
- **Category Browsing**: List products by group/category
- **Code Lookup**: Direct product lookup by code
- **Category Discovery**: List all available product categories

### 3. Intelligent Escalation
- **Automatic Detection**: Identifies situations requiring human intervention
- **Keyword-Based**: Detects complaints, requests for human assistance
- **Proactive Transfer**: Transfers to human without asking customer multiple times
- **Context Preservation**: Maintains conversation history during transfer

### 4. Service Management
- **Ticket Creation**: Automatically creates service tickets for follow-up needs
- **AI Responsibility**: Tracks tickets assigned to AI agent
- **Human Handoff**: Seamlessly transfers tickets to human agents

## Architecture

```
┌─────────────────┐
│  WhatsApp API   │
└────────┬────────┘
         │
┌────────▼────────┐
│  Convex Action  │  (convex/actions/ai.ts)
│  generateAI     │  - Schedules AI responses
│  Response       │  - Handles tool execution results
└────────┬────────┘
         │
┌────────▼────────┐
│   Next.js API   │  (pages/api/integrations/ai/generate-response.ts)
│   Endpoint      │  - Enriches client data from Drizzle DB
└────────┬────────┘
         │
┌────────▼────────┐
│   AI Agent      │  (lib/ai-agent/index.ts)
│   (GPT-4)       │  - Processes conversation
│                 │  - Calls tools as needed
└────────┬────────┘
         │
         ├─────────┬─────────┬─────────┬─────────┐
         │         │         │         │         │
    ┌────▼───┐ ┌──▼──┐  ┌───▼────┐ ┌──▼──┐  ┌──▼──┐
    │Customer│ │Prod.│  │Service │ │Trans│  │ ... │
    │History │ │Cat. │  │Tickets │ │fer  │  │     │
    │Tools   │ │Tools│  │Tools   │ │Tool │  │     │
    └────────┘ └─────┘  └────────┘ └─────┘  └─────┘
                              │
                         ┌────▼────┐
                         │ Drizzle │
                         │Database │
                         └─────────┘
```

## Files Structure

### Core Files

**lib/ai-agent/**
- `index.ts` - Main agent implementation and orchestration
- `prompts.ts` - System prompts and escalation logic
- `tools.ts` - AI SDK tool definitions (9 tools)
- `database-tools.ts` - Database query functions for tools
- `README.md` - This file

### Integration Files

**API Endpoints:**
- `pages/api/integrations/ai/generate-response.ts` - API endpoint that receives chat context

**Convex:**
- `convex/actions/ai.ts` - Convex action that orchestrates AI response generation
- `convex/mutations/services.ts` - Service ticket management mutations

## Available Tools

### Customer Tools

1. **get_customer_purchase_history**
   - Retrieves complete purchase history with optional date filtering
   - Use for: Understanding customer preferences, recommending based on history

2. **get_customer_insights**
   - Returns RFM analysis, statistics, favorite products and groups
   - Use for: Personalizing approach based on customer value

3. **get_customer_recent_purchases**
   - Quick access to most recent purchases
   - Use for: Fast context in conversations

### Product Tools

4. **search_products**
   - Full-text search on product descriptions
   - Use for: "Do you have X?" questions

5. **get_products_by_group**
   - Lists products in a specific category
   - Use for: Browsing categories, showing options

6. **get_product_by_code**
   - Direct lookup by product code
   - Use for: Specific product inquiries

7. **get_available_product_groups**
   - Lists all product categories
   - Use for: "What do you sell?" questions

### Service Tools

8. **create_service_ticket**
   - Creates a service ticket for follow-up
   - Use for: Quote requests, problem reports, scheduling needs

9. **transfer_to_human**
   - Transfers conversation to human agent
   - Use for: Complex issues, complaints, negotiations

## Agent Behavior

### High-Agency Characteristics

The agent is designed to be **proactive** rather than reactive:

- **Anticipates Needs**: Uses purchase history to suggest products before being asked
- **Personalizes Approach**: Adjusts tone based on RFM customer value
- **Takes Initiative**: Creates tickets proactively when detecting needs
- **Decides Autonomously**: Transfers to humans without asking customer first when appropriate

### Escalation Criteria

The agent automatically escalates in these situations:

1. **Explicit Requests**: Customer asks to speak with a person
2. **Complaints**: Detected negative sentiment or problem keywords
3. **Complex Negotiations**: Pricing, custom orders, special terms
4. **Technical Issues**: Safety concerns, complex installations
5. **Service Problems**: Delivery issues, returns, exchanges

### Conversation Style

- **Natural WhatsApp Tone**: Conversational, not overly formal
- **Concise**: 2-3 paragraphs maximum
- **Emoji Usage**: Moderate use to maintain friendly tone 😊
- **No Repetitive Phrases**: Doesn't end every message with "How can I help?"
- **Fluid Flow**: Doesn't repeat greetings after initial message

## Configuration

### Environment Variables Required

```bash
# Cloudflare AI Gateway (or direct OpenAI)
AI_GATEWAY_API_KEY=your_key_here

# Application URL for API calls
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Database
SUPABASE_DB_URL=your_database_url
```

### Customizing the Agent

**To modify agent personality:**
Edit `lib/ai-agent/prompts.ts` → `ENHANCED_SYSTEM_PROMPT`

**To add/remove escalation keywords:**
Edit `lib/ai-agent/prompts.ts` → `ESCALATION_KEYWORDS`

**To add new tools:**
1. Create database function in `database-tools.ts`
2. Define tool in `tools.ts` with proper Zod schema
3. Add to `agentTools` export

**To adjust tool descriptions:**
Edit the `description` field in each tool definition in `tools.ts`

## Database Integration

The agent directly queries the PostgreSQL database via Drizzle ORM:

**Tables Used:**
- `clients` - Customer data and RFM analysis
- `sales` - Sales/orders data
- `sale_items` - Individual items in sales
- `products` - Product catalog

**Optimizations:**
- Uses existing indexes for performance
- Limits query results to prevent timeouts
- Caches customer data in request context

## Usage Examples

### Example 1: Product Recommendation

**Customer**: "Preciso de fios para uma instalação"

**Agent Flow**:
1. Calls `get_customer_recent_purchases` to see what they bought before
2. Calls `search_products` with "fios"
3. Responds with personalized recommendations based on history

### Example 2: Complaint Escalation

**Customer**: "A furadeira que comprei semana passada quebrou!"

**Agent Flow**:
1. Detects escalation keyword "quebrou"
2. Calls `transfer_to_human` immediately
3. Creates context summary for human agent
4. Responds: "Vou te transferir agora para nossa equipe..."

### Example 3: Quote Request

**Customer**: "Preciso de orçamento para material elétrico pra 3 cômodos"

**Agent Flow**:
1. Calls `create_service_ticket` with details
2. Asks follow-up questions about the project
3. Informs customer: "Criei um atendimento, nossa equipe vai entrar em contato"

## Monitoring and Debugging

### Logs

All agent actions are logged with prefixes:
- `[AI_AGENT]` - Agent-level operations
- `[AI_ACTION]` - Convex action operations
- `[DATABASE_TOOLS]` - Database query operations

### Metadata Tracking

Every AI response includes metadata:
```typescript
{
  toolsUsed: string[],          // Which tools were called
  transferToHuman: boolean,      // Was transfer initiated?
  ticketCreated: boolean,        // Was a ticket created?
  escalationReason?: string      // Why was it escalated?
}
```

### Common Issues

**Issue**: Agent not using tools
- **Solution**: Check that tools are properly exported in `tools.ts`
- **Solution**: Verify API key is valid and has sufficient credits

**Issue**: Database queries failing
- **Solution**: Check SUPABASE_DB_URL is set correctly
- **Solution**: Verify database schema matches expected structure

**Issue**: Escalation not working
- **Solution**: Check keywords in `prompts.ts`
- **Solution**: Verify Convex mutations exist and are exported

## Performance Considerations

### Response Times
- **Average**: 2-5 seconds
- **With Tools**: 3-8 seconds (depending on number of tools called)
- **Database Queries**: < 500ms each

### Cost Optimization
- Tool results are kept concise to minimize tokens
- Customer data is fetched once per request
- Queries use database indexes for speed
- Agent is limited in tool iterations (maxSteps removed due to API constraints)

### Rate Limiting
- Implement rate limiting at the API endpoint level
- Consider caching frequent product searches
- Limit concurrent AI requests per customer

## Future Enhancements

### Potential Additions
1. **Order Placement Tool**: Allow agent to create orders directly
2. **Inventory Check Tool**: Real-time stock availability
3. **Pricing Tool**: Access to customer-specific pricing
4. **Memory System**: Long-term memory of customer preferences
5. **Multi-language Support**: Detect and respond in customer's language
6. **Sentiment Analysis**: More sophisticated escalation triggers
7. **Follow-up Scheduling**: Automatic follow-ups based on customer value

### Scaling Considerations
- Consider moving to edge runtime for faster responses
- Implement caching layer for frequent queries
- Add request queuing for high-traffic periods
- Consider fine-tuning a smaller model for common queries

## Security Notes

- **No Direct Price Information**: Agent doesn't have access to pricing data
- **Read-Only Database Access**: Tools only query, never modify data
- **Input Validation**: All tool parameters are validated with Zod schemas
- **Error Handling**: Graceful degradation if tools fail
- **PII Protection**: Customer data is logged minimally

## Testing

### Manual Testing Scenarios

1. **Basic Conversation**: Test natural flow
2. **Product Search**: "Vocês têm disjuntor de 20A?"
3. **Purchase History**: "O que eu comprei da última vez?"
4. **Complaint**: "Estou insatisfeito com o produto"
5. **Transfer Request**: "Quero falar com um atendente"
6. **Quote Request**: "Preciso de um orçamento"

### Expected Behaviors

- Agent should use tools proactively
- Responses should be concise (2-3 paragraphs)
- Escalation should happen quickly for complaints
- Customer history should inform recommendations

## Support

For questions or issues with the AI agent implementation, refer to:
- This documentation
- Vercel AI SDK documentation: https://sdk.vercel.ai/
- Drizzle ORM documentation: https://orm.drizzle.team/

---

**Last Updated**: October 2025
**Version**: 1.0.0
**Author**: AI Agent Enhancement Project

