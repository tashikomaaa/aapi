import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema(
    {
    name: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
    );

    export default mongoose.models.Product || mongoose.model('Product', ProductSchema);