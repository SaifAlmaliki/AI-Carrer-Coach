// Import required dependencies
import { db } from "@/lib/prisma";          // Database connection
import { auth } from "@clerk/nextjs/server"; // Authentication
import { GoogleGenerativeAI } from "@google/generative-ai"; // AI model for generating questions

// Initialize Google's Generative AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Set up the model to use Gemini 1.5 Flash
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Function to generate quiz questions based on user's industry and skills
export async function generateQuiz() {
  // Authenticate user and get their ID
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Fetch user's industry and skills from database
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: {
      industry: true,
      skills: true,
    },
  });

  if (!user) throw new Error("User not found");

  // Construct prompt for AI model to generate relevant questions
  const prompt = `Generate 10 multiple-choice technical interview questions for a ${user.industry} professional${
        user.skills?.length ? ` with expertise in ${user.skills.join(", ")}` : ""
      }.

      Each question must:
      - Be relevant to ${user.industry} and align with ${user.skills?.length ? `${user.skills.join(", ")}` : "general industry knowledge"}.
      - Include four answer choices, with only one correct answer.
      - Be designed to assess practical knowledge, problem-solving skills, or theoretical understanding.

      Provide the response strictly in the following JSON format, without any additional text or explanations outside of the JSON:
      {
        "questions": [
          {
            "question": "string",
            "options": ["string", "string", "string", "string"],
            "correctAnswer": "string",
            "explanation": "string"
          }
        ]
      }

      Guidelines:
      - Ensure the correct answer is accurate and well-researched.
      - The explanation should briefly clarify why the correct answer is right.
      - Avoid overly simple or ambiguous questions.
      - Ensure technical depth is appropriate for a professional level.

      Do not include any introductory or closing remarks—only return the JSON object.
    `;

  try {
    // Generate questions using the AI model
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    // Clean up the response by removing markdown code blocks
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();
    const quiz = JSON.parse(cleanedText);

    return quiz.questions;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw new Error("Failed to generate quiz questions");
  }
}

// Function to save quiz results and generate improvement tips
export async function saveQuizResult(questions, answers, score) {
  // Authenticate user
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  // Map questions and user answers to create detailed results
  const questionResults = questions.map((q, index) => ({
    question: q.question,
    answer: q.correctAnswer,
    userAnswer: answers[index],
    isCorrect: q.correctAnswer === answers[index],
    explanation: q.explanation,
  }));

  // Filter out wrong answers for improvement tips
  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

  let improvementTip = null;
  if (wrongAnswers.length > 0) {
    // Format wrong answers for the AI prompt
    const wrongQuestionsText = wrongAnswers
      .map(
        (q) =>
          `Question: "${q.question}"\nCorrect Answer: "${q.answer}"\nUser Answer: "${q.userAnswer}"`
      )
      .join("\n\n");

    // Generate improvement tip based on wrong answers
    const improvementPrompt = `The user answered the following ${user.industry} technical interview questions incorrectly:

        ${wrongQuestionsText}

        Based on these mistakes, provide a concise and actionable improvement tip that directly addresses the user's knowledge gaps.

        Guidelines:
        - Focus on what the user should learn or practice rather than pointing out errors.
        - Keep the response brief (under 2 sentences) and constructive.
        - Use an encouraging tone to motivate improvement.
        - Ensure the tip is specific, relevant, and practical.

        Example format:
        "To strengthen your understanding of [topic], focus on [specific concept or practice method]. Keep practicing [related task] to reinforce this knowledge."

        Do not include any additional commentary—only return the improvement tip.
      `;

    try {
      const tipResult = await model.generateContent(improvementPrompt);
      improvementTip = tipResult.response.text().trim();
      console.log(improvementTip);
    } catch (error) {
      console.error("Error generating improvement tip:", error);
      // Continue without improvement tip if generation fails
    }
  }

  try {
    // Save Quiz results to database
    const assessment = await db.assessment.create({
      data: {
        userId: user.id,
        quizScore: score,
        questions: questionResults,
        category: "Technical",
        improvementTip,
      },
    });

    return assessment;
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw new Error("Failed to save quiz result");
  }
}

// Function to retrieve user's assessment history
export async function getAssessments() {
  // Authenticate user
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    // Fetch all assessments for the user, ordered by creation date
    const assessments = await db.assessment.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return assessments;
  } catch (error) {
    console.error("Error fetching assessments:", error);
    throw new Error("Failed to fetch assessments");
  }
}
