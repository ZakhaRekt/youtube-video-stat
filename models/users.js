import mongoose from 'mongoose';
const schema = mongoose.Schema({
    ID: String,
    username: String,
    firstName: String,
    lastName: String,
    followingVideos: { type: Array, default: [] },
    checkedVideos: { type: Array, default: [] },
    isAdmin: { type: Boolean, default: false },
    language: { type: String, default: "en" },
    checkCuldown: { type: Number, default: 0 },
    
});
export default mongoose.model("user", schema);