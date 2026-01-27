# Database Connection Guide

This directory contains the configuration for connecting to Supabase:

## Available Connections

### 1. Supabase Client (client.ts)
- Uses Supabase client for database operations
- Provides client-side database access with RLS enforcement
- Best for authenticated user operations

```javascript
import { supabase } from '@/lib/supabase/client';
```

### 2. Supabase Server Client (server.ts)
- Server-side client with automatic session management
- Handles authentication cookies automatically
- Best for server components and API routes

```javascript
import { createClient } from '@/lib/supabase/server';
```

### 3. Supabase Admin Client (admin.ts)
- Service role client with full table access
- Bypasses Row Level Security (RLS) rules
- Only for admin/service operations

```javascript
import { supabaseAdmin } from '@/lib/supabase/admin';
```

## Environment Variables

Make sure to set the Supabase credentials in your `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Usage Examples

### Using Client:
```javascript
import { supabase } from '@/lib/supabase/client';

const { data, error } = await supabase
  .from('users')
  .select('*');
```

### Using Server Client:
```javascript
import { createClient } from '@/lib/supabase/server';

export default async function handler(req, res) {
  const supabase = createClient();
  // Your operations here
}
```

### Using Admin Client:
```javascript
import { supabaseAdmin } from '@/lib/supabase/admin';

const { data, error } = await supabaseAdmin
  .from('users')
  .select('*');
```
```