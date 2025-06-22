import { NextFunction, Request, Response } from 'express';

export const dynamicCors = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const origin = req.headers.origin;
  const botId = req.body?.botId || req.query?.botId;

  if (!origin || !botId) {
    res
      .status(400)
      .json({ error: 'Origin and botId are required for CORS validation' });
    return;
  }

  try {
    const botResponse = await fetch(`http://localhost:5000/bot/${botId}`);
    if (!botResponse.ok) {
      throw new Error(`Failed to fetch bot config`);
    }

    const botData = await botResponse.json();
    res.locals.botData = botData;
    const allowedOrigins: string[] = botData.botConfig.allowedOrigins || [];

    if (!allowedOrigins.includes(origin)) {
      res.status(403).json({ error: 'Origin not allowed' });
      return;
    }

    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  } catch (err) {
    console.error('CORS check failed:', err);
    res.status(500).json({ error: 'CORS validation error' });
    return;
  }
};
