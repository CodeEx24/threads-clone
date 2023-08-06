import mongoose from 'mongoose';

const threadSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  parentId: {
    type: String,
  },
  // can have multiple threads (COMMENTS - Explanation below)
  children: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Thread',
    },
  ],
});

const Thread = mongoose.models.Thread || mongoose.model('Thread', threadSchema);

export default Thread;

// Original Thread(parent)
//   => Thread Comment1 (child)
//   => Thread Comment2 (childof Original, Parent of Below)
//     => Thread Comment 2 1 (child)
