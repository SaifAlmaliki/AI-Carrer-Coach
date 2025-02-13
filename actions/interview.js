'use server';

// Import required dependencies
import { db } from "@/lib/prisma";          // Database connection
import { auth } from "@clerk/nextjs/server";  // Authentication
import { GoogleGenerativeAI } from "@google/generative-ai"; // AI model for generating questions

// Initialize Google's Generative AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// Set up the model to use Gemini 1.5 Flash
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Function to generate quiz questions based on user's industry and skills
export async function generateQuiz(quizType = ["technical"]) {
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

  // Define question types and their prompts
  const questionTypes = {
    technical: `technical interview questions focusing on ${user.industry} skills${
      user.skills?.length ? ` and expertise in ${user.skills.join(", ")}` : ""
    }`,
    behavioral: `behavioral interview questions about past experiences, problem-solving, and work style in the ${user.industry} field`,
    leadership: `leadership and management interview questions about team handling, decision making, and project management in ${user.industry}`,
  };

  const type = quizType[0]; // Get the single selected type
  const questionType = questionTypes[type];

  // Construct prompt for AI model to generate relevant questions
  const prompt = `Generate 10 ${questionType}.

      Each question must:
      - Be relevant to ${user.industry}
      - Include four answer choices, with only one correct answer
      - ${type === 'technical' ? 'Focus on practical knowledge and problem-solving' : ''}
      - ${type === 'behavioral' ? 'Focus on past experiences and situation handling' : ''}
      - ${type === 'leadership' ? 'Focus on team management and decision making' : ''}

      Provide the response strictly in the following JSON format, without any additional text or explanations outside of the JSON:
      {
        "questions": [
          {
            "question": "string",
            "options": ["string", "string", "string", "string"],
            "correctAnswer": "string",
            "explanation": "string",
            "type": "${type}"
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

  // Get the category based on question types
  const getCategory = (questions) => {
    const types = [...new Set(questions.map(q => q.type))];
    if (types.length === 1) {
      return types[0].charAt(0).toUpperCase() + types[0].slice(1); // Capitalize single type
    }
    return types.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' & '); // Combine multiple types
  };

  // Create question results with detailed information
  const questionResults = questions.map((q, index) => ({
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    userAnswer: answers[index],
    isCorrect: q.correctAnswer === answers[index],
    explanation: q.explanation,
    type: q.type,
  }));

  // Filter out wrong answers for improvement tips
  const wrongAnswers = questionResults.filter((q) => !q.isCorrect);

  let improvementTip = "";
  if (wrongAnswers.length > 0) {
    // Format wrong answers for the prompt
    const wrongQuestionsText = wrongAnswers
      .map(
        (q) => `Question: ${q.question}\nCorrect Answer: ${q.correctAnswer}\nExplanation: ${q.explanation}`
      )
      .join("\n\n");

    // Generate improvement tip based on wrong answers
    const improvementPrompt = `The user answered the following ${user.industry} interview questions incorrectly:

        ${wrongQuestionsText}

        Based on these mistakes, provide 3-4 specific, actionable tips for improvement.
        Format your response as a numbered list without any markdown formatting (no asterisks).
        Each tip should:
        1. Start with a clear action item
        2. Include specific examples or methods
        3. Suggest relevant resources
        4. Be separated by line breaks for readability

        Example format:
        1. Practice Technical Communication: Work on explaining complex concepts clearly. Use analogies and simple examples. Resources: Technical writing courses on Coursera.

        2. Improve Problem Analysis: Develop a systematic approach to breaking down problems. Practice whiteboarding solutions before coding. Resources: LeetCode problem-solving guides.

        Keep each tip concise and actionable.`;

    const result = await model.generateContent(improvementPrompt);
    improvementTip = result.response.text()
      .replace(/\*\*/g, '') // Remove all asterisks
      .trim();
  }

  // Calculate score as percentage
  const scorePercentage = Math.round(
    (questionResults.filter((q) => q.isCorrect).length / questions.length) * 100
  );

  // Save assessment to database
  const assessment = await db.assessment.create({
    data: {
      userId: user.id,
      quizScore: scorePercentage,
      questions: questionResults,
      category: getCategory(questions),
      improvementTip,
    },
  });

  return assessment;
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
