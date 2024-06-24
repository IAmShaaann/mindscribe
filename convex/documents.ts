import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
interface Context {
  auth: {
    getUserIdentity: () => Promise<any>;
  };
}

const verifyIdentity = async ({ ctx }: { ctx: Context }): Promise<any> => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not Authenticated.");
  }
  return identity;
};

export const archieve = mutation({
  args: {
    id: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const identity = await verifyIdentity({ ctx });
    const userId = identity.subject;
    const existingDocument = await ctx.db.get(args.id);

    if (!existingDocument) throw new Error("Document not found.");

    if (userId !== existingDocument.userId) throw new Error("Unautorized.");

    const archieveRecursive = async (documentId: Id<"documents">) => {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_user_parent", (query) =>
          query.eq("userId", userId).eq("parentDocument", documentId)
        )
        .collect();

      for (const child of children) {
        //Will archieve the chilren at the same level.
        await ctx.db.patch(child._id, {
          isArchieved: true,
        });
        await archieveRecursive(child._id); // Will archieve the children at parent-child level.
      }
    };

    const document = await ctx.db.patch(args.id, {
      isArchieved: true,
    });

    archieveRecursive(args.id);
    return document;
  },
});

export const getSidebar = query({
  args: {
    parentDocument: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const identity = await verifyIdentity({ ctx });
    const userId = identity.subject;
    const documents = ctx.db
      .query("documents")
      .withIndex("by_user_parent", (q) =>
        q.eq("userId", userId).eq("parentDocument", args.parentDocument)
      )
      .filter((q) => q.eq(q.field("isArchieved"), false))
      .order("desc")
      .collect();
    return documents;
  },
});

export const get = query({
  handler: async (ctx) => {
    await verifyIdentity({ ctx });
    const documents = ctx.db.query("documents").collect();
    return documents;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    parentDocument: v.optional(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const identity = await verifyIdentity({ ctx });
    const userId = identity.subject;

    const document = ctx.db.insert("documents", {
      title: args.title,
      parentDocument: args.parentDocument,
      userId: userId,
      isArchieved: false,
      isPublished: false,
    });

    return document;
  },
});

export const getTrash = query({
  handler: async (ctx) => {
    const identity = await verifyIdentity({ ctx });
    const userId = identity.subject;
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (query) => query.eq("userId", userId))
      .filter((query) => query.eq(query.field("isArchieved"), true))
      .order("desc")
      .collect();

    return documents;
  },
});

export const restore = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await verifyIdentity({ ctx });
    const userId = identity.subject;

    const existingDocument = await ctx.db.get(args.id);

    if (!existingDocument) throw new Error("Document not found.");

    if (existingDocument.userId !== userId) throw new Error("Unauthorized.");

    const recursiveRestore = async (documentId: Id<"documents">) => {
      const children = await ctx.db
        .query("documents")
        .withIndex("by_user_parent", (query) =>
          query.eq("userId", userId).eq("parentDocument", documentId)
        )
        .collect();

      for (const child of children) {
        await ctx.db.patch(child._id, {
          isArchieved: false,
        });

        await recursiveRestore(child._id);
      }
    };

    const options: Partial<Doc<"documents">> = {
      isArchieved: false,
    };

    if (existingDocument.parentDocument) {
      const parent = await ctx.db.get(existingDocument.parentDocument);
      if (parent?.isArchieved) {
        options.parentDocument = undefined;
      }
    }

    const document = await ctx.db.patch(args.id, options);
    recursiveRestore(args.id);
    return document;
  },
});

export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await verifyIdentity({ ctx });
    const userId = identity.subject;

    const existingDocument = await ctx.db.get(args.id);

    if (!existingDocument) throw new Error("Document not found.");

    if (existingDocument.userId !== userId) throw new Error("Unauthorized.");

    const document = await ctx.db.delete(args.id);
    return document;
  },
});

export const getSearch = query({
  handler: async (ctx) => {
    const identity = await verifyIdentity({ ctx });
    const userId = identity.subject;

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (query) => query.eq("userId", userId))
      .filter((query) => query.eq(query.field("isArchieved"), false))
      .order("desc")
      .collect();

    return documents;
  },
});

export const getById = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const document = await ctx.db.get(args.documentId);

    if (!document) throw new Error("Document not found.");

    if (document.isPublished && !document.isArchieved) {
      return document;
    }

    if (!identity) {
      throw new Error("Not Authenticated.");
    }

    const userId = identity.subject;

    if (document.userId !== userId) {
      throw new Error("Unauthorized.");
    }

    return document;
  },
});

export const update = mutation({
  args: {
    id: v.id("documents"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    icon: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await verifyIdentity({ ctx });
    const userId = identity.subject;

    const { id, ...rest } = args;

    const existingDocument = await ctx.db.get(id);
    if (!existingDocument) throw new Error("Document not found.");

    if (existingDocument.userId !== userId) throw new Error("Unauthorized.");

    const document = ctx.db.patch(id, {
      ...rest,
    });

    return document;
  },
});

export const removeIcon = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const identity = await verifyIdentity({ ctx });
    const userId = identity.subject;

    const existingDocument = await ctx.db.get(args.id);
    if (!existingDocument) throw new Error("Document not found.");
    if (existingDocument.userId !== userId) throw new Error("Unauthorized");
    const document = await ctx.db.patch(args.id, {
      icon: undefined,
    });

    return document;
  },
});
