/**
 * Convex Auth Configuration
 *
 * This file configures authentication for the Kimia platform.
 * Uses Convex Auth with email/password provider.
 */

import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password({
      profile(params) {
        // Pass through name and role from params
        const name = (params.name as string) || (params.email as string);
        const role = (params.role as string) || "faculty";

        return {
          email: params.email as string,
          name,
          role, // Pass role through to the profile
        };
      },
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, args) {
      console.log('[afterUserCreatedOrUpdated] called with args:', args);

      // Only create profile for new users
      if (args.existingUserId) {
        console.log('[afterUserCreatedOrUpdated] Existing user, skipping profile creation');
        return;
      }

      // Extract role from profile data
      const role = (args.profile as any).role || "faculty";
      console.log('[afterUserCreatedOrUpdated] Creating profile with role:', role);

      // Check if profile already exists
      const existingProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q: any) => q.eq("userId", args.userId))
        .first();

      if (!existingProfile) {
        console.log('[afterUserCreatedOrUpdated] Creating new userProfile');
        // Create user profile
        const profileId = await ctx.db.insert("userProfiles", {
          userId: args.userId,
          role,
          active: true,
          createdAt: Date.now(),
        });
        console.log('[afterUserCreatedOrUpdated] Created profile with ID:', profileId);
      } else {
        console.log('[afterUserCreatedOrUpdated] Profile already exists:', existingProfile._id);
      }
    },
  },
});
