"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

// Initialize Google's Generative AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Configure the model to use Gemini 1.5 Flash for optimal performance
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


// Saves or updates a user's resume content in the database
export async function saveResume(content) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Fetch user details from database
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) throw new Error("User not found");

  try {
    // Create or update resume using upsert operation
    const resume = await db.resume.upsert({
      where: { userId: user.id },
      update: { content },
      create: {
        userId: user.id,
        content,
      },
    });

    // Invalidate the resume page cache to show updated content
    revalidatePath("/resume");
    return resume;
  } catch (error) {
    console.error("Error saving resume:", error);
    throw new Error("Failed to save resume");
  }
}


// Retrieves a user's resume from the database
export async function getResume() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Fetch user details from database
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) throw new Error("User not found");

  // Return user's resume
  return await db.resume.findUnique({
    where: { userId: user.id },
  });
}


// Improves resume content using AI
export async function improveWithAI({ current, type }) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Fetch user details including industry insights
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    include: { industryInsight: true },
  });
  if (!user) throw new Error("User not found");

  // Construct AI prompt for resume content improvement
  const prompt = `
    As an expert resume writer and ATS optimization specialist, enhance the following ${type} description for a ${user.industry} professional.
    Original content: "${current}"

    Optimization requirements:
    1. Begin with powerful action verbs (e.g., spearheaded, orchestrated, pioneered)
    2. Incorporate specific metrics and quantifiable achievements (%, $, time saved, efficiency gains)
    3. Integrate relevant technical skills and ${user.industry}-specific terminology
    4. Follow the STAR method (Situation, Task, Action, Result) where applicable
    5. Emphasize business impact and value creation
    6. Include relevant keywords for ATS optimization
    7. Maintain professional tone and industry-standard formatting
    8. Limit to 1-2 impactful sentences per achievement

    Additional guidelines:
    - Focus on measurable outcomes over daily responsibilities
    - Use present tense for current roles, past tense for previous positions
    - Eliminate first-person pronouns and articles
    - Prioritize achievements that demonstrate leadership, innovation, or problem-solving

    Format the response as a single, polished paragraph without any explanations or additional text. Ensure the final content is ATS-friendly and optimized for the ${user.industry} industry.
  `;

  try {
    // Generate improved content using AI
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Error improving content with AI:", error);
    throw new Error("Failed to improve content with AI");
  }
}
