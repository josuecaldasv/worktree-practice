import express from "express";
import { applyDiscount } from "./pricing";
import { formatDate } from "./dateFormat";

const app = express();

// Read the port from the environment so each worktree can run on its own port.
// This is the key trick for running two dev servers at the same time.
const PORT = Number(process.env.PORT) || 3000;

app.get("/health", (_req, res) => {
  res.json({ status: "ok", today: formatDate(new Date()) });
});

// Try: http://localhost:3000/price?price=100&percentOff=20
app.get("/price", (req, res) => {
  const price = Number(req.query.price);
  const percentOff = Number(req.query.percentOff);
  res.json({ price, percentOff, final: applyDiscount(price, percentOff) });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
