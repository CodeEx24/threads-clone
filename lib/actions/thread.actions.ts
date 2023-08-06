'use server';

import { revalidatePath } from 'next/cache';
import Thread from '../models/thread.model';
import User from '../models/user.model';
import { connectToDB } from '../mongoose';

interface Params {
  text: string;
  author: string;
  communityId: string | null;
  path: string;
}

export async function createThread({
  text,
  author,
  communityId,
  path,
}: Params) {
  try {
    connectToDB();

    const createThread = await Thread.create({
      text,
      author,
      communityId: null,
    });

    // Update user model
    await User.findByIdAndUpdate(author, {
      $push: { threads: createThread._id },
    });

    revalidatePath(path);

    // Update community model
  } catch (error: any) {
    throw new Error(`Error creating thread ${error.message}`);
  }
}

export async function fetchPosts(pageNumber = 1, pageSize = 20) {
  try {
    connectToDB(); // Connect to the MongoDB database

    // Calculate the number of posts to skip based on the pageNumber and pageSize
    const skipAmount = (pageNumber - 1) * pageSize;

    // Query the 'Thread' collection to find posts with no parentId (main threads)
    const postsQuery = Thread.find({ parentId: { $in: [null, undefined] } })
      .sort({ createdAt: 'desc' }) // Sort the posts by createdAt field in descending order
      .skip(skipAmount) // Skip a certain number of posts based on pagination
      .limit(pageSize) // Limit the number of posts returned per page
      .populate({ path: 'author', model: User }) // Populate the 'author' field with user information
      .populate({
        path: 'children', // Populate the 'children' field with child posts
        populate: {
          path: 'author', // Populate the 'author' field of child posts with user information
          model: User, // The User model to use for populating
          select: '_id name parentId image', // Select specific fields to populate
        },
      });

    const totalPostCount = await Thread.countDocuments({
      parentId: { $in: [null, undefined] },
    });

    const posts = await postsQuery.exec();

    const isNext = totalPostCount > skipAmount + posts.length;

    return { posts, isNext };

    // Update the 'children' array in the 'Community' model (not implemented in this code snippet)
  } catch (error: any) {
    throw new Error(`Error creating thread ${error.message}`);
  }
}

export async function fetchThreadById(id: string) {
  try {
    connectToDB(); // Connect to the MongoDB database

    // 🔴 TODO: Populate the community
    const thread = await Thread.findById(id)
      // Author Details
      .populate({
        path: 'author',
        model: User,
        select: '_id id name parentId image',
      })
      // Comments Details (1st Level)
      .populate({
        path: 'children',
        // Author details of children
        populate: [
          {
            path: 'author',
            model: User,
            select: '_id id name parendId image',
          },
          // children details for its
          {
            path: 'children',
            model: Thread,
            populate: {
              path: 'author',
              model: 'User',
              select: '_id id name parendId image',
            },
          },
        ],
      })
      .exec();

    return thread;
  } catch (error: any) {
    throw new Error(`Error creating thread ${error.message}`);
  }
}

export async function addCommentToThread(
  threadId: string,
  commentText: string,
  userId: string,
  path: string
) {
  try {
    connectToDB(); // Connect to the MongoDB database

    // Adding a comment
    // Find the thread that is commenting (ThreadId)
    const originalThread = await Thread.findById(threadId);

    if (!originalThread) {
      throw new Error('Thread not found');
    }

    const commentThread = new Thread({
      text: commentText,
      author: userId,
      parentId: threadId,
    });

    const saveCommentThread = await commentThread.save();

    originalThread.children.push(saveCommentThread._id);

    await originalThread.save();

    revalidatePath(path);
    // The post will have a children
  } catch (error: any) {
    throw new Error(`Error adding comment to thread ${error.message}`);
  }
}
