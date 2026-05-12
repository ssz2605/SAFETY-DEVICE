require('dotenv').config();  

const connectDB = require('./config/database');
require('dotenv').config();

const test = async () => {
  await connectDB();
  console.log("DB test complete ✅");
  process.exit();
};

test();
