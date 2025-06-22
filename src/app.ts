import express, { Request, NextFunction, Response } from 'express';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import cors from 'cors';
import * as cheerio from 'cheerio';

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
const ENDPOINT = process.env.ENDPOINT;

function extractPatchNotes(html: string) {
  const $ = cheerio.load(html);

  $('.embedExternal, a, img').remove();

  $('strong').each((_, el) => {
    const text = $(el).text();
    $(el).replaceWith(`**${text}**`);
  });

  let result = '';

  $('body')
    .find('h2, h3, p, ul, li')
    .each((_, el) => {
      const tag = $(el)[0].tagName;
      const text = $(el).text().trim();

      if (!text) return;

      switch (tag) {
        case 'h2':
          result += `\n\n## ${text}\n\n`;
          break;
        case 'h3':
          result += `\n\n### ${text}\n\n`;
          break;
        case 'p':
          result += `${text}\n\n`;
          break;
        case 'ul':
          break;
        case 'li':
          result += `- ${text}\n`;
          break;
      }
    });

  return result.trim();
}

app.get('/patches', async (req: Request, res: Response) => {
  try {
    const patch = req.query.patch?.toString() || '510';

    console.log('Getting patches for patch No.' + patch);

    const response = await fetch(`${ENDPOINT}${patch}`);

    const html = await response.json();

    if (!response.ok) {
      res.send(html.message);
      return;
    }

    const cleanedText = extractPatchNotes(html.body);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const result = await model.generateContent([
      `The following is a raw extract of patch notes:\n\n${cleanedText}`,
      `Summarize all important changes into a single, clear paragraph. 
      Maintain a professional and neutral tone — do not include informal phrases, introductions, or conclusions. 
      Avoid bullet points and lists. Focus on rewriting the content as a polished summary of the patch only.
      Start every paragraph with "Patch [patch-id]"`,
    ]);

    const text = result.response.text();

    res.send(text);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to fetch or parse HTML');
  }
});

export default app;
