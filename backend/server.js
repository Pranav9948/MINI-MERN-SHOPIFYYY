const express = require("express");
const app = express();

const dotenv = require("dotenv");
dotenv.config("./env");

const port = 5000;

const dbConfig = require("../backend/config/dbconfig");
const shopRoutes = require("./routes/shopRoutes");

app.use(express.json());
app.use("/api/shop", shopRoutes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
