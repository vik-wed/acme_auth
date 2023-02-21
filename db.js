const Sequelize = require("sequelize");
const { STRING } = Sequelize;
const config = {
  logging: false,
};
require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

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

User.byToken = async (token) => {
  try {
    const userId = await jwt.verify(token, process.env.SECRET_KEY);
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
      const token = await jwt.sign(user.id, process.env.SECRET_KEY);
      return token;
    }
  }
  const error = Error("bad credentials");
  error.status = 401;
  throw error;
};

User.beforeCreate(async (user) => {
  const SALT = 10;
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
  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
  },
};
