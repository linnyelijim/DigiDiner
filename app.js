process.on("uncaughtException", (err) => {
  console.error(err, "Uncaught Exception thrown");
  process.exit(1);
});

var createError = require("http-errors");
var express = require("express");
var path = require("path");
var session = require("express-session");
var logger = require("morgan");
var glob = require("glob");
var bodyParser = require("body-parser");

var utils = require("./utils");

var Employee = require("./models/employee");

var sessionOptions = {
  secret: process.env.SESSION_SECRET || "your-secret",
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: true,
    maxAge: 12 * 60 * 60 * 1000, // Session lasts for 12 hours
  },
};

if (process.env.NODE_ENV === "development") {
  sessionOptions.cookie.secure = false; // Secure cookies only work on an HTTPS server
}

BigInt.prototype.toJSON = function () {
  return this.toString();
}; // Used for BigInt model IDs

var app = express();

async function main() {
  var conn = require("./controllers/databaseController.js").getConnection();

  // view engine setup
  app.set("views", path.join(__dirname, "views"));
  app.set("view engine", "ejs");

  // trust first proxy
  app.set("trust proxy", 1);

  app.use(
    logger("dev", {
      skip: function (req, res) {
        return res.statusCode == 304; // Don't log 304s to avoid spam due to polling
      },
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(session(sessionOptions));
  app.use(
    "/jquery",
    express.static(path.join(__dirname, "node_modules/jquery/dist"))
  );
  app.use(express.static(path.join(__dirname, "public")));
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());

  app.use(
    utils.asyncHandler(async function (req, res, next) {
      if (req.session.employeeId != null) {
        req.employee = new Employee(req.session.employeeId);
        await req.employee.load();
      }
      next();
    })
  );

  // Loads all models from the models directory
  glob.sync("./models/**/*.js").forEach(function (file) {
    let model = require(path.resolve(file));
    if (typeof model.connectDatabase === "function")
      model.connectDatabase(conn);
    else
      console.warn(
        "Model " +
          path.basename(file) +
          " does not have a connectDatabase method!"
      );
  });

  // Loads all routes from the routes directory
  glob.sync("./routes/**/*.js").forEach(function (file) {
    let route = file.slice(6, -3).replaceAll("\\", "/");
    if (route.endsWith("index")) {
      route = route.slice(0, -5);
    }
    app.use(route, require(path.resolve(file)));
  });

  // catch 404 and forward to error handler
  app.use(function (req, res, next) {
    next(createError(404));
  });

  // error handler
  app.use(function (err, req, res, next) {
    if (err.status == null || err.status >= 500) console.error(err);

    if (req.url.startsWith("/api")) {
      res.status(err.status || 500).json(err);
      return;
    }

    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.code = err.status || 500;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error");
  });
}

main();

module.exports = app;
