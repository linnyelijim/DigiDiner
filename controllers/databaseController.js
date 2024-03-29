const mongoose = require("mongoose");

const getConnection = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is not defined in the environment variables."
      );
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
  }
};

/* const mariadb = require('mariadb');
const fs = require('fs');

const dbConfig = JSON.parse(fs.readFileSync('./config/dbConfig.json'));

const dbConnPool = mariadb.createPool(dbConfig);

function getConnection() {
     return dbConnPool;
} */

module.exports = {
  getConnection,
};
