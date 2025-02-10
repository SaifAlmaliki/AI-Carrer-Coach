// Server actions for managing user data, including updating user profiles and checking onboarding status.

"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { generateAIInsights } from "./dashboard";

/**
 * Updates user profile information, including industry, experience, bio, and skills.
 * Also handles the creation of industry insights if they don't already exist.
 */
export async function updateUser(data) {
  // Authenticate the user.
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Retrieve the user from the database.
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    // Use a transaction to ensure atomicity of operations.
    const result = await db.$transaction(
      async (tx) => {
        // Check if industry insights already exist.
        let industryInsight = await tx.industryInsight.findUnique({
          where: {
            industry: data.industry,
          },
        });

        // If industry insights don't exist, generate and create them.
        if (!industryInsight) {
          const insights = await generateAIInsights(data.industry);

          industryInsight = await tx.industryInsight.create({
            data: {
              industry: data.industry,
              ...insights,
              nextUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });
        }

        // Update the user's profile information.
        const updatedUser = await tx.user.update({
          where: {
            id: user.id,
          },
          data: {
            industry: data.industry,
            experience: data.experience,
            bio: data.bio,
            skills: data.skills,
          },
        });

        // Return the updated user and industry insight.
        return { updatedUser, industryInsight };
      },
      {
        timeout: 10000, // default: 5000
      }
    );

    // Revalidate the path to update the cache.
    revalidatePath("/");
    return result.updatedUser;
  } catch (error) {
    // Handle specific error codes from Prisma.
    if (error.code === "P2002") {
      console.error(`Error updating user and industry: ${error.message}. Please check for duplicate entries.`);
      throw new Error(`Failed to update profile: Duplicate entry found`);
    } else if (error.code === "P2025") {
      console.error(`Error updating user and industry: ${error.message}. Please check for missing relations.`);
      throw new Error(`Failed to update profile: Missing relation found`);
    } else {
      // Generic error handling.
      console.error(`Error updating user and industry: ${error.message}. Please check your API key and ensure it is valid.`);
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }
}


// Retrieves the onboarding status of a user.
export async function getUserOnboardingStatus() {
  // Authenticate the user.
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Retrieve the user from the database.
  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  try {
    // Retrieve the user with only the industry field.
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
      select: {
        industry: true,
      },
    });

    // Determine if the user is onboarded based on the existence of an industry.
    return {
      isOnboarded: !!user?.industry,
    };
  } catch (error) {
    // Handle errors during onboarding status check.
    console.error("Error checking onboarding status:", error);
    throw new Error("Failed to check onboarding status");
  }
}
