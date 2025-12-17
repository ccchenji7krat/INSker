// app/api/extract/route.ts
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `
You are a data extraction engine specialized in Instagram Profile Screenshots. 
Analyze the image and extract the following JSON structure:
{
  "username": "The main account handle (usually at the very top or bolded). Do NOT include @ symbol. Do NOT mistake bio mentions for the main username.",
  "emails": ["Array of email addresses found in the bio or contact buttons"],
  "confidence": "High/Medium/Low based on visibility"
}

Rules for Emails:
1. Look for standard emails (name@domain.com).
2. Reconstruct obfuscated emails (e.g., "name [at] domain dot com" -> "name@domain.com").
3. If multiple emails exist, list all.
4. Ignore emails that clearly belong to other people mentioned in the bio (unless unsure).

Rules for Username:
1. It is usually the largest text at the top center or top left.
2. It is strictly the handle, not the display name (e.g., extract "john_doe", not "John Doe | Fitness").
`;

export async function POST(req: Request) {
  try {
    const { base64Image } = await req.json();

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Cost-effective and vision-capable
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract profile data from this screenshot." },
            { type: "image_url", image_url: { url: base64Image } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });

    const data = JSON.parse(response.choices[0].message.content || "{}");
    return NextResponse.json(data);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Extraction failed" }, { status: 500 });
  }
}
