const express = require("express");
const path = require("path");

const app = express();
const port = Number(process.env.PORT || 3000);

app.use("/theme", express.static(path.join(__dirname, "..", "theme")));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`Local frontend running at http://localhost:${port}`);
});
