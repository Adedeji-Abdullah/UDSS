// import mongoose from 'mongoose';
// import cors from 'cors';
// import express from 'express';
// import dotenv from 'dotenv';
// import multer from 'multer';

const mongoose = require('mongoose');
const cors = require('cors');
const express = require('express');
const dotenv = require('dotenv');
const multer = require('multer');


dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/udss', (req, res) => {
    console.log("UDSS!!!")
})

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
})
