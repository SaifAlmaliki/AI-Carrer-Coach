import { currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";

export const checkUser = async () => {
  const user = await currentUser();
  if (!user) { return null; }

  try {
    const loggedInUser = await db.user.findUnique({
      where: {
        clerkUserId: user.id,
      },
    });

    // If the user is found, return the user object
    if (loggedInUser) { return loggedInUser; }

    // Create a new user name by combining first and last names
    const name = `${user.firstName} ${user.lastName}`;

    // Create a new user in the database
    const newUser = await db.user.create({
      data: {
        clerkUserId: user.id,
        name,
        imageUrl: user.imageUrl,
        email: user.emailAddresses[0].emailAddress,
      },
    });

    // Return the newly created user object
    return newUser;
  } catch (error) {
    // Log any errors that occur during the process
    console.log(error.message);
  }
};
