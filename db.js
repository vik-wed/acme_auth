const Sequelize = require("sequelize");
const { STRING } = Sequelize;
const config = {
  logging: false,
};
require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const SALT = 10;

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost/acme_db",
  config
);

const User = conn.define("user", {
  username: STRING,
  password: STRING,
});

const Note = conn.define("note", {
  text: STRING,
});

User.hasMany(Note);
Note.belongsTo(User);

User.byToken = async (token) => {
  try {
    const { userId } = jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findByPk(userId);
    if (user) {
      return user;
    }
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error("bad credentials");
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
    },
  });
  if (user) {
    const result = await bcrypt.compare(password, user.password);
    if (result) {
      return jwt.sign({ userId: user.id }, process.env.SECRET_KEY);
    }
  }
  const error = Error("bad credentials");
  error.status = 401;
  throw error;
};

User.beforeCreate(async (user) => {
  const hashedPassword = await bcrypt.hash(user.password, SALT);
  user.password = hashedPassword;
});

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: "lucy", password: "lucy_pw" },
    { username: "moe", password: "moe_pw" },
    { username: "larry", password: "larry_pw" },
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );
  const notes = [
    { text: "hello world", userId: lucy.id },
    { text: "goodbye world", userId: lucy.id },
    { text: "hello again", userId: lucy.id },
    { text: "how is everybody", userId: moe.id },
    { text: "doing today", userId: moe.id },
    { text: "we are adding", userId: larry.id },
    { text: "notes", userId: larry.id },
    { text: "to every", userId: larry.id },
    { text: "single user", userId: larry.id },
  ];
  const allNotes = await Promise.all(notes.map((note) => Note.create(note)));
  return {
    users: {
      lucy,
      moe,
      larry,
    },
    allNotes,
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note,
  },
};
