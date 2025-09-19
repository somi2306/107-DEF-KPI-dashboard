import { User } from "../models/userModel.js";
import { clerkClient } from "@clerk/clerk-sdk-node";

export const getAllUsers = async (req, res, next) => {
	try {
		const currentUserId = req.auth().userId; 
		const users = await User.find({ clerkId: { $ne: currentUserId } });
		res.status(200).json(users);
	} catch (error) {
		next(error);
	}
};



export const updateUserProfile = async (req, res, next) => {
    try {
        const userId = req.auth().userId; 
        const { firstName, lastName, imageUrl } = req.body;

        const { clerkClient } = await import("@clerk/clerk-sdk-node"); 
        await clerkClient.users.updateUser(userId, {
            firstName: firstName,
            lastName: lastName,
        });

        
        const updatedUser = await User.findOneAndUpdate(
            { clerkId: userId },
            { fullName: `${firstName || ""} ${lastName || ""}`.trim(), imageUrl },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found in local DB" });
        }

        res.status(200).json({ message: "Profile updated successfully!", user: updatedUser });
    } catch (error) {
        console.error("Error updating user profile:", error);
        next(error);
    }
};


export const addEmailAddress = async (req, res, next) => {
    try {
        const userId = req.auth().userId;
        const { emailAddress, setPrimary, markVerified } = req.body; 

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized - User ID not found" });
        }
        if (!emailAddress) {
            return res.status(400).json({ message: "Email address is required" });
        }

        const secretKey = process.env.CLERK_SECRET_KEY;
        if (!secretKey) {
            throw new Error("CLERK_SECRET_KEY is not set in environment variables.");
        }

        const clerkApiUrl = "https://api.clerk.dev/v1/email_addresses";

        const response = await fetch(clerkApiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${secretKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                email_address: emailAddress,
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Clerk API error during add email:", data);
            throw new Error(data.errors?.[0]?.longMessage || "Failed to add email address.");
        }

        res.status(200).json({ message: "Email address added, verification email sent.", email: data });
    } catch (error) {
        console.error("Error adding email address:", error);
        next(error);
    }
};


export const attemptEmailAddressVerification = async (req, res, next) => {
    try {
        const { emailAddressId, code } = req.body;

        if (!emailAddressId || !code) {
            return res.status(400).json({ message: "Email ID and verification code are required" });
        }

        const secretKey = process.env.CLERK_SECRET_KEY;
        if (!secretKey) {
            throw new Error("CLERK_SECRET_KEY is not set in environment variables.");
        }

        const clerkApiUrl = `https://api.clerk.dev/v1/email_addresses/${emailAddressId}/verify`;

        const response = await fetch(clerkApiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${secretKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Clerk API error during email verification:", data);
            throw new Error(data.errors?.[0]?.longMessage || "Failed to verify email address.");
        }

        res.status(200).json({ message: "Email address verified successfully.", email: data });
    } catch (error) {
        console.error("Error verifying email address:", error);
        next(error);
    }
};


export const updatePassword = async (req, res, next) => {
    try {
        const userId = req.auth().userId;
        const { newPassword, currentPassword } = req.body; 

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized - User ID not found" });
        }
        if (!newPassword) {
            return res.status(400).json({ message: "New password is required" });
        }

        const secretKey = process.env.CLERK_SECRET_KEY;
        if (!secretKey) {
            throw new Error("CLERK_SECRET_KEY is not set in environment variables.");
        }

        const clerkApiUrl = `https://api.clerk.dev/v1/users/${userId}`;

        const requestBody = {
            password: newPassword,
        };

        const response = await fetch(clerkApiUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${secretKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Clerk API error during password update:", data);
            throw new Error(data.errors?.[0]?.longMessage || "Failed to update password.");
        }
        res.status(200).json({ message: "Password updated successfully!" });
    } catch (error) {
        console.error("Error updating password:", error);
        next(error);
    }
};



export const getAllUserSessions = async (req, res, next) => {
  try {
    const userId = req.auth().userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized - User ID not found" });
    }

    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new Error("CLERK_SECRET_KEY is not set in environment variables.");
    }

    const clerkApiUrl = `https://api.clerk.dev/v1/sessions?user_id=${userId}`;
    
    const response = await fetch(clerkApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Clerk API error: ${response.status} - ${errorData.errors?.[0]?.longMessage || response.statusText}`);
    }

    const sessions = await response.json();
    res.status(200).json(sessions);
  } catch (error) {
    console.error("Error getting user sessions:", error);
    next(error);
  }
};



export const revokeUserSession = async (req, res, next) => {
    try {
        const userId = req.auth().userId; 
        const { sessionId } = req.params;

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized - User ID not found" });
        }
        if (!sessionId) {
            return res.status(400).json({ message: "Session ID is required" });
        }

        const secretKey = process.env.CLERK_SECRET_KEY;
        if (!secretKey) {
            throw new Error("CLERK_SECRET_KEY is not set in environment variables.");
        }

        const clerkApiUrl = `https://api.clerk.dev/v1/sessions/${sessionId}/revoke`;

        const response = await fetch(clerkApiUrl, {
            method: 'POST', 
            headers: {
                'Authorization': `Bearer ${secretKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Clerk API error: ${response.status} - ${errorData.errors?.[0]?.longMessage || response.statusText}`);
        }

        const revokedSession = await response.json(); 
        res.status(200).json({ message: "Session revoked successfully", revokedSession });
    } catch (error) {
        console.error("Error revoking user session:", error);
        next(error);
    }
};