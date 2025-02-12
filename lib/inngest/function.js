/**
 * Industry Insights Generator
 *
 * This module automatically generates and updates industry insights using Inngest for scheduling
 * and Google's Gemini AI for content generation. It runs weekly to maintain up-to-date
 * information about various industries including salary ranges, growth rates, and market trends.
 *
 * Key Features:
 * - Scheduled weekly execution (Sundays at midnight)
 * - AI-powered industry analysis using Gemini 1.5
 * - Automated database updates
 * - Structured JSON output format
 */

import { db } from "@/lib/prisma";
import { inngest } from "./client";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const generateIndustryInsights = inngest.createFunction(
  { name: "Generate Industry Insights" },
  { cron: "0 0 * * 0" }, // Run every Sunday at midnight
  async ({ event, step }) => {
    // Step 1: Fetch all industries from the database
    const industries = await step.run("Fetch industries", async () => {
      return await db.industryInsight.findMany({
        select: { industry: true },
      });
    });

    // Step 2: Process each industry
    for (const { industry } of industries) {
      // Construct AI prompt with specific JSON structure requirements
      const prompt = `
          Analyze the current state of the ${industry} industry and provide insights in ONLY the following JSON format without any additional notes or explanations:
          {
            "salaryRanges": [
              { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
            ],
            "growthRate": number,
            "demandLevel": "High" | "Medium" | "Low",
            "topSkills": ["skill1", "skill2"],
            "marketOutlook": "Positive" | "Neutral" | "Negative",
            "keyTrends": ["trend1", "trend2"],
            "recommendedSkills": ["skill1", "skill2"]
          }

          IMPORTANT: Return ONLY the JSON. No additional text, notes, or markdown formatting.
          Include at least 5 common roles for salary ranges.
          Growth rate should be a percentage.
          Include at least 5 skills and trends.
        `;

      // Step 3: Generate insights using Gemini AI
      const res = await step.ai.wrap("gemini", async (p) => {
        return await model.generateContent(p);
      }, prompt);

      // Step 4: Clean and parse the AI response
      const text = res.response.candidates[0].content.parts[0].text || "";
      const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
      const insights = JSON.parse(cleanedText);

      // Step 5: Update database with new insights
      await step.run(`Update ${industry} insights`, async () => {
        await db.industryInsight.update({
          where: { industry },
          data: {
            ...insights,
            lastUpdated: new Date(),
            nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Set next update to 7 days from now
          },
        });
      });
    }
  }
);
