import mongoose from "mongoose";
import cors from "cors";
import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import User from "./model/user.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/udss", (req, res) => {
  console.log("UDSS!!!");
  res.json({ message: "UDSS endpoint hit!" });
});

app.post("/register", async (req, res) => {
  const dataInfo = req.body;
  console.log(dataInfo);
  if (!dataInfo.name || !dataInfo.email || !dataInfo.UId || !dataInfo.class || dataInfo.subjects < 10) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  try {
    const data = await new User(dataInfo);
    // const result = await data.json()
    console.log(data);
    res.json(data);
  } catch (error) {
    console.log(error);
  }
});

app.post('/login', async (req, res) => {
    const data = req.body;
    if(!data.name || !data.email || !data.UId) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    try {
        const result = await User.findOne({ UId: data.UId });
    console.log(result.json())
    if (result) {
        res.json(result)
    }
    } catch (err) {
        res.status(404).json({message: "User not found"})
    }
    // Add login logic here
});

app.listen(process.env.PORT, async () => {
  try {
    await mongoose.connect(process.env.MONGO_CONNECTION);
    console.log("good " + process.env.PORT);
  } catch (error) {
    console.log(error);
  }
});
