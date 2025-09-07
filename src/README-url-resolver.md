# URL Resolver

A minimal function to resolve shortened URLs using SOCKS5 proxy.

## Usage

```typescript
import { getFinalUrl, getFinalUrlWithProxy } from "./url-resolver";

// With custom proxy
const finalUrl = await getFinalUrl(
  "https://t.co/PeiH9dJevF",
  "socks5://user:pass@host:port"
);

// With default proxy
const finalUrl = await getFinalUrlWithProxy("https://t.co/PeiH9dJevF");
```

## Example

```bash
# Test from command line
pnpm command:ts -e "import { getFinalUrlWithProxy } from './simple-url-resolver'; getFinalUrlWithProxy('https://t.co/PeiH9dJevF').then(console.log)"
```

## Features

- ✅ Resolves shortened URLs (t.co, bit.ly, etc.)
- ✅ Follows HTTP redirects
- ✅ Handles meta refresh redirects
- ✅ Works with SOCKS5 proxy
- ✅ Simple, minimal code
