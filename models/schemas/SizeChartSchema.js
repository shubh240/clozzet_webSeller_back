import mongoose from "mongoose";

const sizeChartSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: true,
    },
    measurements: {
      bust: Number, // upper wear
      chest: Number, // optional alias or extra
      waist: Number, // both
      hip: Number, // lower
      thigh: Number, // lower
      length: Number, // both
      shoulder: Number, // upper
      sleeve: Number, // upper
      inseam: Number, // lower
      outseam: Number, // lower
      age: String, // for children
      note: String, // optional notes
    },
  },
  { _id: false }
);

export default sizeChartSchema;
