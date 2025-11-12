import {
  mutation,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import { logActivity } from "./activities";

const FINANCE_ROLES = ["sysadmin", "admin", "finance"] as const;

type GenericCtx = MutationCtx | QueryCtx;

async function getCurrentProfile(ctx: GenericCtx) {
  const userId = await auth.getUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .first();

  if (!profile) {
    throw new Error("User profile not found");
  }

  return { userId, profile } as const;
}

function userCanManageProjectFinancials(
  proposal: any,
  userId: Id<"users">,
  role: string
) {
  if (FINANCE_ROLES.includes(role as (typeof FINANCE_ROLES)[number])) {
    return true;
  }
  if (proposal.principalInvestigator === userId) {
    return true;
  }
  if ((proposal.teamMembers ?? []).some((memberId: Id<"users">) => memberId === userId)) {
    return true;
  }
  return false;
}

export const generateReceiptUploadUrl = mutation({
  args: {
    projectId: v.id("proposals"),
  },
  handler: async (ctx: MutationCtx, { projectId }) => {
    const { userId, profile } = await getCurrentProfile(ctx);
    const proposal = await ctx.db.get(projectId);

    if (!proposal) {
      throw new Error("Project not found for receipt upload");
    }

    const canManage = userCanManageProjectFinancials(proposal, userId, profile.role);
    if (!canManage) {
      throw new Error("Unauthorized to upload receipts for this project");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const attachReceiptToTransaction = mutation({
  args: {
    transactionId: v.id("transactions"),
    receiptStorageId: v.id("_storage"),
  },
  handler: async (ctx: MutationCtx, { transactionId, receiptStorageId }) => {
    const { userId, profile } = await getCurrentProfile(ctx);

    const transaction = await ctx.db.get(transactionId);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    const proposal = await ctx.db.get(transaction.projectId);
    if (!proposal) {
      throw new Error("Project not found for transaction");
    }

    const canManage = userCanManageProjectFinancials(proposal, userId, profile.role);
    if (!canManage) {
      throw new Error("Unauthorized to update this transaction");
    }

    const previousReceipt: Id<"_storage"> | null =
      transaction.receipt ?? null;

    await ctx.db.patch(transaction._id, {
      receipt: receiptStorageId,
    });

    if (previousReceipt && previousReceipt !== receiptStorageId) {
      try {
        await ctx.storage.delete(previousReceipt);
      } catch (error) {
        console.warn("Failed to delete previous receipt", previousReceipt, error);
      }
    }

    await logActivity(ctx, {
      userId,
      action: "transaction.receipt_attached",
      entityType: "proposal",
      entityId: transaction.projectId,
      details: {
        transactionId,
        receiptStorageId,
        replacedReceipt: Boolean(previousReceipt && previousReceipt !== receiptStorageId),
      },
    });
  },
});

export const generateReceiptDownloadUrl = mutation({
  args: {
    transactionId: v.id("transactions"),
  },
  handler: async (ctx: MutationCtx, { transactionId }) => {
    const { userId, profile } = await getCurrentProfile(ctx);

    const transaction = await ctx.db.get(transactionId);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    if (!transaction.receipt) {
      throw new Error("No receipt uploaded for this transaction");
    }

    const proposal = await ctx.db.get(transaction.projectId);
    if (!proposal) {
      throw new Error("Project not found for transaction");
    }

    const canManage = userCanManageProjectFinancials(proposal, userId, profile.role);
    if (!canManage) {
      throw new Error("Unauthorized to download this receipt");
    }

    const downloadUrl = await ctx.storage.getUrl(transaction.receipt);
    if (!downloadUrl) {
      throw new Error("Unable to generate receipt download link");
    }

    return downloadUrl;
  },
});
