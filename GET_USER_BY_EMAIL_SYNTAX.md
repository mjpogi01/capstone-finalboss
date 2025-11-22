# Supabase getUserByEmail Syntax

## Basic Syntax

```javascript
const { data, error } = await supabase.auth.admin.getUserByEmail(email);
```

## Response Structure

```javascript
{
  data: {
    user: {
      id: "user-uuid",
      email: "user@example.com",
      user_metadata: {
        full_name: "John Doe",
        name: "John",
        // ... other metadata
      },
      // ... other user properties
    }
  },
  error: null // or error object if failed
}
```

## Complete Example

```javascript
const normalizedEmail = email.toLowerCase().trim();

try {
  const { data: userData, error: getUserError } = await supabase.auth.admin.getUserByEmail(normalizedEmail);
  
  if (getUserError) {
    console.error('Error fetching user:', getUserError.message);
    // Handle error
    return;
  }
  
  if (userData && userData.user) {
    const user = userData.user;
    const userName = user.user_metadata?.full_name || 
                     user.user_metadata?.name ||
                     user.email?.split('@')[0] || null;
    
    console.log('User found:', user.id);
    console.log('User name:', userName);
  } else {
    console.log('User not found');
  }
} catch (error) {
  console.error('Exception:', error.message);
}
```

## With Fallback Pattern

```javascript
let user = null;
let userName = null;

try {
  // Try getUserByEmail first
  const { data: userData, error: getUserError } = await supabase.auth.admin.getUserByEmail(normalizedEmail);
  
  if (!getUserError && userData && userData.user) {
    // Success - user found
    user = userData.user;
    userName = userData.user.user_metadata?.full_name || 
               userData.user.user_metadata?.name ||
               userData.user.email?.split('@')[0] || null;
  } else {
    // Fallback: use listUsers if getUserByEmail fails
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    
    if (!listError && usersData && usersData.users) {
      const foundUser = usersData.users.find(
        u => u.email && u.email.toLowerCase() === normalizedEmail
      );
      
      if (foundUser) {
        user = foundUser;
        userName = foundUser.user_metadata?.full_name || 
                   foundUser.user_metadata?.name ||
                   foundUser.email?.split('@')[0] || null;
      }
    }
  }
} catch (error) {
  console.error('Error fetching user:', error.message);
}
```

## Important Notes

1. **Requires Admin Client**: Must use `supabase.auth.admin.getUserByEmail()` (not regular client)
2. **Service Role Key**: Requires `SUPABASE_SERVICE_ROLE_KEY` in environment
3. **Email Normalization**: Always normalize email to lowercase before querying
4. **Error Handling**: Method may not exist in all Supabase versions - use fallback pattern
5. **Response Structure**: User is nested in `data.user`, not directly in `data`

## Checking if Method Exists

```javascript
if (supabase.auth.admin.getUserByEmail) {
  const { data, error } = await supabase.auth.admin.getUserByEmail(email);
  // ... handle response
} else {
  // Fallback to listUsers
  const { data: usersData } = await supabase.auth.admin.listUsers();
  // ... search through users
}
```

