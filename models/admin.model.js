import mongoose from "mongoose";

const AdminAuthSchema = new mongoose.Schema(
  {
    userInfo: {
      firstName: {
        type: String,
        required: true,
      },
      lastName: {
        type: String,
        required: true,
      },
     
    },
    userAuth: {
      email: {
        type: String,
        required: true,
        unique: true,
      },
      password: {
        type: String,
        required: true,
      },
    
    },
  },
  { timestamps: true }
);

export const AdminAuth = mongoose.model(
  "AdminAuth",
  AdminAuthSchema
);
    