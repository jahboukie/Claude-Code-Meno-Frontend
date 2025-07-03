// packages/apps/partner-support/src/lib/user.ts
import { User as FirebaseAuthUser } from "firebase/auth";

// This reuses the same onboarding function as the MenoWellness app
export async function onboardUser(user: FirebaseAuthUser) {
    const onboardFunctionUrl = "https://onboardnewuser-2vcq24dcma-uc.a.run.app"; 

    try {
        await fetch(onboardFunctionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // CORRECTED: Nest the user object in a 'data' property
            body: JSON.stringify({ data: user.toJSON() }),
        });
    } catch (error) {
        console.error("Error calling onboardUser function:", error);
    }
}
