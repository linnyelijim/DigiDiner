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

module.exports = {
  getConnection,
};
/*for a .json file:
 {
    "socketPath": "/var/run/mysqld/mysqld.sock",
    "user": "digidiner-admin",
    "database": "digidiner"
} */
