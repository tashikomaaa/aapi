# Security Features Guide

## Overview

AAPI now supports comprehensive security features including JWT authentication, role-based authorization, rate limiting, input sanitization, audit logging, and OWASP security headers.

## Getting Started

### Creating a Secure Project

```bash
# Create a new project with security features
aapi create my-api --secure

# With GraphQL Yoga (default)
aapi create my-api --secure --yoga

# With Apollo Server
aapi create my-api --secure --apollo
```

### Security Features Included

When using the `--secure` flag, your project includes:

- ✅ **JWT Authentication** - Access & refresh token system
- ✅ **Role-Based Access Control (RBAC)** - User, moderator, admin roles
- ✅ **Rate Limiting** - DDoS protection with configurable limits
- ✅ **Input Sanitization** - XSS and NoSQL injection prevention
- ✅ **Security Headers** - OWASP recommended headers (CSP, HSTS, etc.)
- ✅ **Audit Logging** - Track all operations with MongoDB TTL
- ✅ **Password Security** - bcrypt hashing with salt rounds
- ✅ **Account Locking** - After 5 failed login attempts
- ✅ **Token Rotation** - Refresh token system for security

## Configuration

### 1. Generate JWT Secrets

**IMPORTANT**: Before deploying to production, generate secure secrets:

```bash
cd my-api
npm run security:generate-secret
```

This will output a cryptographically secure random string. Generate **two different secrets** for access and refresh tokens.

### 2. Update .env File

```bash
cp .env.example .env
```

Edit `.env` and update these critical values:

```env
# JWT Configuration (CHANGE THESE!)
ACCESS_TOKEN_SECRET=your-super-secret-access-token-secret-change-in-production
REFRESH_TOKEN_SECRET=your-super-secret-refresh-token-secret-change-in-production
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:4000

# Database
MONGODB_URI=mongodb://localhost:27017/my-api

# Server
PORT=4000
NODE_ENV=development
```

### 3. Token Expiry Configuration

- **ACCESS_TOKEN_EXPIRY**: Short-lived (15 minutes recommended)
  - Values: `15m`, `30m`, `1h`
- **REFRESH_TOKEN_EXPIRY**: Long-lived (7 days recommended)
  - Values: `7d`, `14d`, `30d`

## Authentication Flow

### 1. User Registration

```graphql
mutation Register {
  register(
    input: {
      email: "user@example.com"
      password: "SecurePassword123!"
      firstName: "John"
      lastName: "Doe"
    }
  ) {
    user {
      _id
      email
      firstName
      lastName
      role
    }
    accessToken
    refreshToken
  }
}
```

**Password Requirements:**

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### 2. User Login

```graphql
mutation Login {
  login(email: "user@example.com", password: "SecurePassword123!") {
    user {
      _id
      email
      role
    }
    accessToken
    refreshToken
  }
}
```

**Rate Limiting**: Login attempts are limited to 5 per 15 minutes per IP/user.

**Account Locking**: After 5 failed attempts, account is locked for 2 hours.

### 3. Using Access Tokens

Include the access token in your requests:

```javascript
// HTTP Headers
{
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

```graphql
# GraphQL request with authentication
query GetProfile {
  me {
    _id
    email
    firstName
    lastName
    role
  }
}
```

### 4. Token Refresh

When access token expires (after 15 minutes):

```graphql
mutation RefreshToken {
  refreshToken(refreshToken: "your-refresh-token-here") {
    accessToken
    refreshToken
  }
}
```

This returns a **new** access token and refresh token (token rotation for security).

### 5. Logout

```graphql
mutation Logout {
  logout
}
```

Invalidates the current refresh token.

### 6. Change Password

```graphql
mutation ChangePassword {
  changePassword(currentPassword: "OldPassword123!", newPassword: "NewSecurePassword456!") {
    _id
    email
  }
}
```

**Security Features:**

- Requires current password verification
- New password cannot match last 5 passwords
- Updates `lastPasswordChange` timestamp

## Authorization

### Role-Based Access Control (RBAC)

Three built-in roles with hierarchical permissions:

```javascript
// Role hierarchy
{
  USER: 'user',          // Basic access
  MODERATOR: 'moderator', // Elevated access
  ADMIN: 'admin'         // Full access
}
```

### Protecting Resolvers

#### 1. Require Authentication

```javascript
import { requireAuth } from '../../middleware/auth.js';

export default {
  Query: {
    // Only authenticated users can access
    myProfile: requireAuth(async (_, __, context) => {
      return context.user;
    }),
  },
};
```

#### 2. Require Specific Role

```javascript
import { requireRole } from '../../middleware/auth.js';

export default {
  Mutation: {
    // Only admins can delete users
    deleteUser: requireRole('admin', async (_, { id }) => {
      return User.findByIdAndDelete(id);
    }),

    // Moderators and admins can approve content
    approvePost: requireRole(['moderator', 'admin'], async (_, { id }) => {
      return Post.findByIdAndUpdate(id, { approved: true }, { new: true });
    }),
  },
};
```

#### 3. Require Resource Ownership or Admin

```javascript
import { requireOwnerOrAdmin } from '../../middleware/auth.js';

export default {
  Mutation: {
    // Users can update their own posts, admins can update any
    updatePost: requireOwnerOrAdmin(
      'Post', // Model name
      'postId', // ID parameter name
      async (_, { postId, input }) => {
        return Post.findByIdAndUpdate(postId, input, { new: true });
      }
    ),
  },
};
```

### Authorization Patterns

```javascript
// Manual authorization check
const resolver = async (_, args, context) => {
  // Check if authenticated
  if (!context.isAuthenticated) {
    throw new Error('Authentication required');
  }

  // Check role
  if (context.user.role !== 'admin') {
    throw new Error('Admin access required');
  }

  // Check ownership
  const resource = await Resource.findById(args.id);
  if (resource.userId.toString() !== context.user.id && context.user.role !== 'admin') {
    throw new Error('Access denied');
  }

  // Proceed with operation
  return resource;
};
```

## Rate Limiting

### Built-in Rate Limiters

Three rate limiters with different configurations:

```javascript
// General API requests
apiLimiter: {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // 100 requests per window
}

// Authentication endpoints (strict)
authLimiter: {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                   // 5 attempts per window
}

// Authenticated users (generous)
authenticatedLimiter: {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,                // 1000 requests per window
}
```

### Using Rate Limiters

```javascript
import { applyRateLimit } from '../../middleware/rateLimiter.js';

export default {
  Mutation: {
    sensitiveOperation: async (_, args, context) => {
      // Apply strict rate limit
      applyRateLimit(context, 'auth');

      // Proceed with operation
      return performSensitiveOperation(args);
    },
  },
};
```

### Rate Limit Headers

Responses include rate limit information:

```javascript
{
  "X-RateLimit-Limit": 100,
  "X-RateLimit-Remaining": 95,
  "X-RateLimit-Reset": 1640000000000
}
```

### Customizing Rate Limits

Edit `src/middleware/rateLimiter.js`:

```javascript
export const customLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500, // 500 requests
  message: 'Custom rate limit message',
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});
```

## Input Validation & Sanitization

### Automatic Sanitization

All string inputs are automatically sanitized to prevent XSS:

```javascript
import { sanitizeString, sanitizeObject } from '../../middleware/sanitize.js';

// Removes <script> tags, javascript: protocols, etc.
const clean = sanitizeString('<script>alert("XSS")</script>Hello');
// Result: "Hello"

// Recursively sanitizes all strings in an object
const cleanObj = sanitizeObject({
  name: '<script>evil</script>John',
  bio: 'Normal text',
  nested: {
    field: 'javascript:alert(1)',
  },
});
```

### Input Validation

```javascript
import { validateInput } from '../../middleware/sanitize.js';

const result = validateInput(
  {
    email: 'user@example.com',
    password: 'SecurePass123!',
    age: 25,
  },
  {
    email: {
      required: true,
      type: 'string',
      email: true,
    },
    password: {
      required: true,
      type: 'string',
      minLength: 8,
      pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
    },
    age: {
      type: 'number',
      min: 18,
      max: 120,
    },
  }
);

if (!result.valid) {
  throw new Error(`Validation failed: ${result.errors.join(', ')}`);
}

// Use sanitized data
const { sanitized } = result;
```

### Validation Rules

```javascript
{
  fieldName: {
    required: true,           // Field must be present
    type: 'string',           // Type: string, number, boolean, array, object
    minLength: 8,             // Minimum string length
    maxLength: 100,           // Maximum string length
    min: 0,                   // Minimum number value
    max: 100,                 // Maximum number value
    pattern: /regex/,         // Custom regex pattern
    email: true,              // Email validation
    enum: ['val1', 'val2'],   // Allowed values
  }
}
```

## Security Headers

### OWASP Recommended Headers

All responses include security headers:

```javascript
{
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' ...",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
}
```

### CORS Configuration

Configure allowed origins in `.env`:

```env
ALLOWED_ORIGINS=http://localhost:3000,https://myapp.com,https://www.myapp.com
```

CORS is automatically applied with:

- Credentials support
- Preflight caching
- Origin validation

### Customizing Security Headers

Edit `src/middleware/security.js`:

```javascript
export const securityHeaders = {
  'X-Frame-Options': 'SAMEORIGIN', // Allow same-origin framing
  'Content-Security-Policy': "default-src 'self'; script-src 'self' https://cdn.example.com",
  // Add custom headers
  'X-Custom-Header': 'custom-value',
};
```

## Audit Logging

### Automatic Event Logging

All authentication and CRUD operations are automatically logged:

```javascript
{
  userId: ObjectId("..."),
  operation: "LOGIN",
  resourceType: "User",
  resourceId: "...",
  details: { ip: "192.168.1.1", userAgent: "..." },
  success: true,
  timestamp: ISODate("2024-01-15T10:30:00Z")
}
```

### Operation Types

```javascript
[
  'LOGIN',
  'LOGOUT',
  'REGISTER',
  'CREATE',
  'READ',
  'UPDATE',
  'DELETE',
  'PASSWORD_CHANGE',
  'TOKEN_REFRESH',
  'FAILED_LOGIN',
  'ACCOUNT_LOCKED',
];
```

### Manual Logging

```javascript
import { logAuthEvent, logCrudEvent } from '../../middleware/auditLog.js';

// Log authentication event
await logAuthEvent({
  operation: 'LOGIN',
  userId: user._id,
  ip: context.ip,
  userAgent: context.userAgent,
  success: true,
  details: { method: '2FA' },
});

// Log CRUD operation
await logCrudEvent({
  operation: 'UPDATE',
  resourceType: 'Post',
  resourceId: post._id,
  userId: context.user.id,
  changes: { title: 'New Title' },
  success: true,
});
```

### Querying Audit Logs

```javascript
import AuditLog from './models/AuditLog.js';

// Get user's login history
const loginHistory = await AuditLog.find({
  userId: user._id,
  operation: 'LOGIN',
})
  .sort({ timestamp: -1 })
  .limit(10);

// Get failed login attempts
const failedLogins = await AuditLog.find({
  operation: 'FAILED_LOGIN',
  success: false,
  timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24h
});

// Get all operations on a resource
const resourceHistory = await AuditLog.find({
  resourceType: 'Post',
  resourceId: postId,
}).sort({ timestamp: -1 });
```

### Log Retention

Logs are automatically deleted after **90 days** using MongoDB TTL indexes:

```javascript
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
```

To change retention period, edit `src/models/AuditLog.js`.

## Production Deployment Checklist

### Before Deploying

- [ ] Generate new JWT secrets with `npm run security:generate-secret`
- [ ] Update `ACCESS_TOKEN_SECRET` in production .env
- [ ] Update `REFRESH_TOKEN_SECRET` in production .env
- [ ] Set `NODE_ENV=production`
- [ ] Configure `ALLOWED_ORIGINS` for your production domains
- [ ] Enable HTTPS (required for Strict-Transport-Security header)
- [ ] Set up MongoDB with authentication enabled
- [ ] Review and adjust rate limits for your use case
- [ ] Set up monitoring for failed login attempts
- [ ] Configure audit log retention period
- [ ] Test all authentication flows in staging
- [ ] Review and customize Content-Security-Policy header
- [ ] Set up backup strategy for MongoDB
- [ ] Enable MongoDB replica set for audit log reliability

### Security Best Practices

1. **Never commit .env files** - Use `.env.example` as template
2. **Rotate secrets regularly** - Change JWT secrets every 90 days
3. **Monitor audit logs** - Check for suspicious patterns
4. **Use HTTPS only** - Redirect HTTP to HTTPS
5. **Keep dependencies updated** - Run `npm audit` regularly
6. **Use strong passwords** - Enforce password policy
7. **Implement 2FA** - Add two-factor authentication (future feature)
8. **Rate limit aggressively** - Better safe than sorry
9. **Validate all inputs** - Never trust client data
10. **Log security events** - Track all authentication attempts

### Environment Variables Security

```bash
# Use environment variable management services
# AWS Secrets Manager, HashiCorp Vault, etc.

# Never log secrets
# Never send secrets in error messages
# Never expose secrets in API responses
```

### MongoDB Security

```javascript
// Enable authentication
mongod --auth

// Create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "securePassword",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase"]
})

// Create application user
use myapi
db.createUser({
  user: "apiuser",
  pwd: "securePassword",
  roles: ["readWrite"]
})

// Update connection string
MONGODB_URI=mongodb://apiuser:securePassword@localhost:27017/myapi?authSource=myapi
```

## Troubleshooting

### Common Issues

#### "Invalid token" Error

- **Cause**: Access token expired (15 minutes)
- **Solution**: Use refresh token to get new access token

#### "Account is locked" Error

- **Cause**: 5+ failed login attempts
- **Solution**: Wait 2 hours or manually unlock in database:
  ```javascript
  await User.findByIdAndUpdate(userId, {
    loginAttempts: 0,
    lockUntil: null,
  });
  ```

#### "Too many requests" Error

- **Cause**: Rate limit exceeded
- **Solution**: Wait for window to reset or adjust limits

#### "Authentication required" Error

- **Cause**: Missing or invalid Authorization header
- **Solution**: Include valid access token in headers

#### CORS Errors

- **Cause**: Origin not in ALLOWED_ORIGINS
- **Solution**: Add your frontend URL to .env

### Testing Security

```bash
# Test rate limiting
for i in {1..10}; do curl http://localhost:4000/graphql -d '...' ; done

# Test invalid tokens
curl -H "Authorization: Bearer invalid-token" http://localhost:4000/graphql

# Test XSS protection
curl -d '{"query": "mutation { register(input: {email: \"<script>alert(1)</script>@test.com\"}) }"}' ...

# Check security headers
curl -I http://localhost:4000/graphql
```

## Advanced Topics

### Custom Authentication Strategies

You can extend the authentication system to support:

- OAuth 2.0 (Google, GitHub, etc.)
- SAML
- Two-Factor Authentication (TOTP)
- Biometric authentication
- API keys for service accounts

### Custom Middleware

```javascript
// Add custom security middleware
export function requireEmailVerified(resolver) {
  return (parent, args, context, info) => {
    if (!context.user.emailVerified) {
      throw new Error('Email verification required');
    }
    return resolver(parent, args, context, info);
  };
}
```

### Redis for Rate Limiting

For production, replace in-memory store with Redis:

```javascript
import Redis from 'ioredis';
const redis = new Redis();

class RateLimiter {
  async check(context) {
    const key = `ratelimit:${this.getClientId(context)}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, this.windowMs / 1000);
    }
    return { allowed: count <= this.max };
  }
}
```

## Support

For issues, questions, or feature requests:

- GitHub Issues: https://github.com/yourusername/aapi/issues
- Documentation: https://github.com/yourusername/aapi#readme

## License

MIT License - see LICENSE file for details
