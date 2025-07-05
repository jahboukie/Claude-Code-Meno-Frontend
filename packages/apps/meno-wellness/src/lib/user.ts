import { User as FirebaseAuthUser } from "firebase/auth";

export async function onboardUser(user: FirebaseAuthUser) {
  const functionUrl = "https://onboardnewuser-afsh2nntka-uc.a.run.app"; 

  try {
    await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // CORRECTED: Send the user object directly without the "data" wrapper
      body: JSON.stringify(user.toJSON()),
    });
  } catch (error) {
    console.error("Error calling onboardUser function:", error);
  }
}
