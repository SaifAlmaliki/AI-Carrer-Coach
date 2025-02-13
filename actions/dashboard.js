/**
 * This file contains server actions for fetching and generating industry insights for the user's dashboard.
 * It uses Google's Gemini AI model to generate insights if they don't already exist in the database.
 */

"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export const generateAIInsights = async (industry) => {
  const prompt = `
  Analyze the current state of the ${industry} industry and provide structured insights strictly in the following JSON format without any additional text, notes, or explanations:

  {
    "salaryRanges": [
      { "role": "string", "min": number, "max": number, "median": number, "location": "string" }
    ],
    "growthRate": number,
    "demandLevel": "High" | "Medium" | "Low",
    "topSkills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
    "marketOutlook": "Positive" | "Neutral" | "Negative",
    "keyTrends": ["trend1", "trend2", "trend3", "trend4", "trend5"],
    "recommendedSkills": ["skill1", "skill2", "skill3", "skill4", "skill5"]
  }

  STRICT REQUIREMENTS:
  - Return ONLY valid JSON. No additional explanations, notes, markdown formatting, or extraneous characters.
  - Include salary ranges for at least 5 commonly found roles in this industry.
  - Ensure the growthRate value is expressed as a percentage.
  - The lists (topSkills, keyTrends, recommendedSkills) must contain at least 5 relevant entries each.

  Failure to follow these instructions exactly will result in incorrect output.
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

  return JSON.parse(cleanedText);
};

/**
 * Fetches industry insights for the current user.
 * If no insights exist, it generates them using the Gemini AI model.
 */
export async function getIndustryInsights() {
  // Get the user ID from the authentication context.
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: {
      industryInsight: true,
    },
  });

  if (!user) throw new Error("User not found");

  // If no insights exist, generate them
  if (!user.industryInsight) {
    const insights = await generateAIInsights(user.industry);

    const industryInsight = await db.industryInsight.create({
      data: {
        industry: user.industry,
        ...insights,
        nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return industryInsight;
  }

  return user.industryInsight;
}