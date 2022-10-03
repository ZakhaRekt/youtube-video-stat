import mongoose from 'mongoose';
const schema = mongoose.Schema({
    checkedBy: String,
    title: String,
    url: String,
    videoAlive: { type: Boolean, default: true },
    likes: { type: Number, default: 0 },
    commnets: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    
});
export default mongoose.model("video", schema);