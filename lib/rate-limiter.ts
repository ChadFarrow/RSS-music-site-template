// Simple rate limiter for external API requests
class RateLimiter {
  private requests = new Map<string, number[]>();
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit: number = 10, windowMs: number = 60000) { // 10 requests per minute default
    this.limit = limit;
    this.windowMs = windowMs;
  }

  async checkLimit(key: string): Promise<boolean> {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the time window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.limit) {
      return false; // Rate limited
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true; // Request allowed
  }

  async waitForLimit(key: string, maxWaitMs: number = 10000): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      if (await this.checkLimit(key)) {
        return; // Request allowed
      }
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error(`Rate limit exceeded for ${key}, waited ${maxWaitMs}ms`);
  }

  getDelay(key: string): number {
    const requests = this.requests.get(key) || [];
    if (requests.length < this.limit) {
      return 0;
    }
    const oldestRequest = Math.min(...requests);
    const timeToWait = this.windowMs - (Date.now() - oldestRequest);
    return Math.max(0, timeToWait);
  }
}

// Create domain-specific rate limiters
const domainLimiters = new Map<string, RateLimiter>();

export function getRateLimiter(domain: string): RateLimiter {
  if (!domainLimiters.has(domain)) {
    // More aggressive limiting for known problematic domains
    const limit = domain.includes('wavlake.com') ? 5 : 10; // 5 requests per minute for Wavlake
    const windowMs = domain.includes('wavlake.com') ? 60000 : 30000; // 1 minute for Wavlake, 30s for others
    domainLimiters.set(domain, new RateLimiter(limit, windowMs));
  }
  return domainLimiters.get(domain)!;
}

export async function withRateLimit<T>(
  url: string, 
  fn: () => Promise<T>,
  maxWaitMs: number = 5000
): Promise<T> {
  const domain = new URL(url).hostname;
  const limiter = getRateLimiter(domain);
  
  // Check if we can make the request immediately
  if (await limiter.checkLimit(domain)) {
    return fn();
  }
  
  // If rate limited, wait a bit and try again
  const delay = Math.min(limiter.getDelay(domain), maxWaitMs);
  console.log(`⏳ Rate limiting ${domain}, waiting ${delay}ms`);
  
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Try again after waiting
  if (await limiter.checkLimit(domain)) {
    return fn();
  }
  
  throw new Error(`Rate limited: ${domain} - too many requests`);
}