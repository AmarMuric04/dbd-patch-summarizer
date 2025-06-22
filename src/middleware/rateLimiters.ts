import { Request } from 'express';
import rateLimit from 'express-rate-limit';

export const ipRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests from this IP, please try again later.' },
});

export const botRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  keyGenerator: (req: Request) => {
    return req.body?.botId || req.ip;
  },
  message: { error: 'Too many requests for this bot, please slow down.' },
});
