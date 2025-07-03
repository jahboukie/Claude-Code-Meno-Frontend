import { User as FirebaseAuthUser } from "firebase/auth";

export async function onboardUser(user: FirebaseAuthUser) {
  // The correct URL from your successful deployment
  const functionUrl = "https://onboardnewuser-2vcq24dcma-uc.a.run.app"; 

  try {
    await fetch(functionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: user.toJSON() }),
    });
  } catch (error) {
    console.error("Error calling onboardUser function:", error);
  }
}
