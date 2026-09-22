// const mongoose = require('mongoose')
import mongoose from 'mongoose'

const UserSchema = mongoose.Schema({
    name: String,
    email: String,
    password: String,
    class: String
})

export default mongoose.model('User', UserSchema)