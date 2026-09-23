// const mongoose = require('mongoose')
import mongoose from 'mongoose'

const UserSchema = mongoose.Schema({
    name: String,
    otherNames: String,
    email: String,
    UId: {
        type: String,
        unique: true
    },
    class: String,
    subjects: []
})

export default mongoose.model('User', UserSchema)