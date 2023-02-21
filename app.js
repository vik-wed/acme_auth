const express = require("express");
const app = express();
const {
  models: { User, Note },
} = require("./db");
const path = require("path");

// middleware
app.use(express.json());

// routes
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "index.html")));

app.get("/api/users/:id/notes", async (req, res, next) => {
  try {
    const user = await User.byToken(req.headers.authorization);
    const userNotes = await Note.findAll({ where: { userId: req.params.id } });
    if (user.id !== req.params.id) {
      res.send("Error");
    }
    res.send(userNotes);
  } catch (ex) {
    next(ex);
  }
});

app.post("/api/auth", async (req, res, next) => {
  try {
    res.send({ token: await User.authenticate(req.body) });
  } catch (ex) {
    next(ex);
  }
});

app.get("/api/auth", async (req, res, next) => {
  try {
    res.send(await User.byToken(req.headers.authorization));
  } catch (ex) {
    next(ex);
  }
});

// error handling
app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;
