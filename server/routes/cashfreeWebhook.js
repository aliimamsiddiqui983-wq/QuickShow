import express from "express";

const router = express.Router();

router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    console.log("Cashfree webhook received");

    console.log("Headers:", req.headers);
    console.log("Body:", req.body.toString());

    res.status(200).json({
      received: true,
    });
  }
);

export default router;