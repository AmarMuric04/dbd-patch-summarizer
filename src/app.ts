import express, { Request, NextFunction, Response } from 'express';
import { errorHandler } from './middleware/errorHandler';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from 'cors';
import BotConfig from './models/BotConfig';
import { botRateLimiter, ipRateLimiter } from './middleware/rateLimiters';
import { dynamicCors } from './middleware/dynamicCors';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

app.options('/ask-gemini', dynamicCors);
app.post(
  '/ask-gemini',
  dynamicCors,
  ipRateLimiter,
  botRateLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { prompt, history = [], botId } = req.body;

      if (!prompt) {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      if (!botId) {
        res.status(400).json({ error: 'Bot ID is required' });
        return;
      }

      const botData = res.locals.botData;
      const systemMessage = botData.systemMessage || '';

      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const formattedHistory = [
        {
          role: 'user',
          parts: [{ text: systemMessage }],
        },
        ...history.map((msg: any) => ({
          role: msg.role,
          parts: Array.isArray(msg.parts)
            ? msg.parts
            : [{ text: msg.parts?.text || msg.content || msg.text }],
        })),
      ];

      const chat = model.startChat({
        history: formattedHistory,
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });

      const result = await chat.sendMessage(prompt);
      const response = result.response;
      const text = response.text();

      res.json({ response: text });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  '/create-bot',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        companyName,
        industry,
        tone = 'professional',
        primaryRole = 'customer support assistant',
        allowedTopics = [],
        restrictions = [],
        websiteUrl,
        supportEmail,
        businessHours,
        maxResponseLength = 1000,
        language = 'English',
        personalityTraits = [],
        fallbackMessage,
        greetingMessage,
        allowedOrigins,
      } = req.body;

      if (!companyName) {
        res.status(400).json({ error: 'Company name is required' });
        return;
      }

      const botConfig = new BotConfig({
        companyName,
        industry,
        tone,
        primaryRole,
        allowedTopics,
        restrictions,
        websiteUrl,
        supportEmail,
        businessHours,
        maxResponseLength,
        language,
        personalityTraits,
        fallbackMessage,
        greetingMessage,
        allowedOrigins,
      });

      const savedBot = await botConfig.save();

      const systemMessage = savedBot.generateSystemMessage();

      res.status(201).json({
        success: true,
        botId: savedBot.botId,
        botConfig: savedBot,
        systemMessage: systemMessage,
        message: 'Bot configuration created successfully',
      });
    } catch (error: any) {
      if (error.code === 11000) {
        res
          .status(409)
          .json({ error: 'Bot with this configuration already exists' });
        return;
      }
      next(error);
    }
  },
);

app.get(
  '/bot/:botId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { botId } = req.params;

      const botConfig = await BotConfig.findOne({ botId, isActive: true });

      if (!botConfig) {
        res.status(404).json({ error: 'Bot configuration not found' });
        return;
      }

      const systemMessage = botConfig.generateSystemMessage();

      res.json({
        success: true,
        botConfig,
        systemMessage,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.put(
  '/bot/:botId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { botId } = req.params;
      const updateData = req.body;

      delete updateData.botId;
      delete updateData.createdBy;

      const updatedBot = await BotConfig.findOneAndUpdate(
        { botId, isActive: true },
        updateData,
        { new: true, runValidators: true },
      );

      if (!updatedBot) {
        res.status(404).json({ error: 'Bot configuration not found' });
        return;
      }

      const systemMessage = updatedBot.generateSystemMessage();

      res.json({
        success: true,
        botConfig: updatedBot,
        systemMessage,
        message: 'Bot configuration updated successfully',
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  '/bots',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { page = 1, limit = 10, companyName } = req.query;

      const query: any = { isActive: true };
      if (companyName) {
        query.companyName = { $regex: companyName, $options: 'i' };
      }

      const bots = await BotConfig.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit) * 1)
        .skip((Number(page) - 1) * Number(limit))
        .select('-__v');

      const total = await BotConfig.countDocuments(query);

      res.json({
        success: true,
        bots,
        pagination: {
          current: Number(page),
          total: Math.ceil(total / Number(limit)),
          count: bots.length,
          totalRecords: total,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

app.delete(
  '/bot/:botId',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { botId } = req.params;

      const deletedBot = await BotConfig.findOneAndUpdate(
        { botId, isActive: true },
        { isActive: false },
        { new: true },
      );

      if (!deletedBot) {
        res.status(404).json({ error: 'Bot configuration not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Bot configuration deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  },
);

app.use(errorHandler);

export default app;
