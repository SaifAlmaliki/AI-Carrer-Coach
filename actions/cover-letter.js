/**
 * Cover Letter Generation and Management Module
 *
 * This module provides server actions for generating, retrieving, and managing cover letters
 * using Google's Generative AI (Gemini) and a database for persistence.
 */

"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Google's Generative AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Use Gemini 2.0 model for improved generation capabilities
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function generateCoverLetter(data) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Fetch user profile from database
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  // Define the AI prompt template
  const prompt = `
    Generate a compelling, personalized cover letter for a ${data.jobTitle} position at ${data.companyName}.

    CANDIDATE PROFILE:
    - Industry Experience: ${user.industry}
    - Years of Experience: ${user.experience}
    - Technical Skills: ${user.skills?.join(", ")}
    - Professional Background: ${user.bio}

    JOB DETAILS:
    ${data.jobDescription}

    COVER LETTER REQUIREMENTS:

    1. Structure and Format:
       - Use proper business letter format in markdown
       - Include today's date, company address block (if provided)
       - Professional greeting and strong closing
       - Length: 300-400 words maximum

    2. Content Guidelines:
       - Opening: Strong hook that shows enthusiasm and knowledge of ${data.companyName}
       - Body: 2-3 paragraphs highlighting most relevant experience
       - Closing: Clear call to action and thank you

    3. Key Elements to Include:
       - Specific achievements with measurable results
       - Direct connections between candidate's experience and job requirements
       - Evidence of research about ${data.companyName} and understanding of their needs
       - Demonstration of cultural fit and alignment with company values

    4. Tone and Style:
       - Professional yet personable
       - Confident but not arrogant
       - Enthusiastic and engaging
       - Clear and concise language

    5. Must Demonstrate:
       - Understanding of the role's requirements
       - Relevant technical expertise and soft skills
       - Problem-solving abilities through specific examples
       - Growth potential and learning mindset

    Format the entire letter in clean, professional markdown.
    Ensure all achievements and claims are specific and backed by the candidate's background.
  `;

  try {
    // Generate cover letter content using Gemini AI
    const result = await model.generateContent(prompt);
    const content = result.response.text().trim();

    // Save the generated cover letter to database
    const coverLetter = await db.coverLetter.create({
      data: {
        content,
        jobDescription: data.jobDescription,
        companyName: data.companyName,
        jobTitle: data.jobTitle,
        status: "completed",
        userId: user.id,
      },
    });

    return coverLetter;
  } catch (error) {
    console.error("Error generating cover letter:", error.message);
    throw new Error("Failed to generate cover letter");
  }
}

/**
 * Retrieves all cover letters for the authenticated user
 * @returns {Promise<Array>} List of user's cover letters, sorted by creation date
 * @throws {Error} If user is unauthorized
 */
export async function getCoverLetters() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Fetch user profile
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  // Retrieve all cover letters for the user, sorted by creation date
  return await db.coverLetter.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

// Retrieves a specific cover letter by ID for the authenticated user
export async function getCoverLetter(id) {
  // Verify user authentication
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Fetch user profile
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  // Retrieve specific cover letter, ensuring it belongs to the user
  return await db.coverLetter.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });
}

// Deletes a specific cover letter by ID
export async function deleteCoverLetter(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Fetch user profile
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  // Delete the cover letter, ensuring it belongs to the user
  return await db.coverLetter.delete({
    where: {
      id,
      userId: user.id,
    },
  });
}
