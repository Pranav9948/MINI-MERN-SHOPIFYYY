const express = require("express");
const router = express.Router();
const Shop = require("../models/ShopModel");

//

const nonce = require("nonce")();
const querystring = require("querystring");
const axios = require("axios");


//

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOPIFY_REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI;

// Create a new shop
router.post("/", async (req, res) => {
  try {
    const { shopId, accessToken } = req.body;
    const shop = await Shop.create({ shopId, accessToken });
    res.json(shop);
  } catch (error) {
    console.error("Error creating shop:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get shop by ID
router.get("/:id", async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    res.json(shop);
  } catch (error) {
    console.error("Error fetching shop:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update shop by ID
router.put("/:id", async (req, res) => {
  try {
    const { shopId, accessToken } = req.body;
    const shop = await Shop.findByIdAndUpdate(
      req.params.id,
      { shopId, accessToken },
      { new: true }
    );
    res.json(shop);
  } catch (error) {
    console.error("Error updating shop:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete shop by ID
router.delete("/:id", async (req, res) => {
  try {
    await Shop.findByIdAndRemove(req.params.id);
    res.json({ message: "Shop deleted successfully" });
  } catch (error) {
    console.error("Error deleting shop:", error);
    res.status(500).json({ error: "Server error" });
  }
});

//install

router.get("/install", (req, res) => {
  const shop = req.query.shop;

  // Generate a unique value for the installation request
  const state = nonce();

  // Build the install URL for the app
  const installUrl =
    `https://${shop}/admin/oauth/authorize?` +
    querystring.stringify({
      client_id: SHOPIFY_API_KEY,
      scope: "read_products,write_products",
      redirect_uri: SHOPIFY_REDIRECT_URI,
      state: state,
    });

  // Store the nonce in session
  req.session.state = state;

  // Redirect the user to the install URL
  res.redirect(installUrl);
});

//Handle the OAuth callback from Shopify after the user authorizes the app:




router.get('/callback', async (req, res) => {
    const { shop, hmac, code, state } = req.query;
    const storedState = req.session.state;
  
    // Verify the nonce to prevent CSRF attacks
    if (state !== storedState) {
      return res.status(403).send('Request origin cannot be verified');
    }
  
    // Verify the request signature to prevent tampering
    const hmacVerified = verifyHmac(hmac, req);
  
    if (!hmacVerified) {
      return res.status(400).send('HMAC validation failed');
    }
  
    // Exchange the temporary code for a permanent access token
    try {
      const accessToken = await exchangeCodeForAccessToken(shop, code);
  
      // Store the access token in the database
      const shopData = await Shop.findOneAndUpdate(
        { shopId: shop },
        { accessToken },
        { new: true, upsert: true }
      );
  
      // Register the webhook with Shopify
      const response = await axios.post('/webhooks/register', {
        shop,
        accessToken,
      });
  
      // Redirect the user to the app dashboard with a success message
      res.redirect(`/dashboard?shop=${shop}`);
    } catch (error) {
      console.error('Error authenticating:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });
  



// Helper functions

function verifyHmac(hmac, req) {
  const params = { ...req.query };
  delete params["hmac"];
  const message = querystring.stringify(params);
  const digest = crypto
    .createHmac("sha256", SHOPIFY_API_SECRET)
    .update(message)
    .digest("hex");
  return hmac === digest;
}

async function exchangeCodeForAccessToken(shop, code) {
  const response = await axios({
    method: "post",
    url: `https://${shop}/admin/oauth/access_token`,
    data: {
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code: code,
    },
  });

  if (response.status === 200) {
    return response.data.access_token;
  } else {
    throw new Error("Failed to exchange code for access token");
  }
}

///Implementing a route to handle webhook registration requests from shopify:

// This route receives the Shopify shop and access token from the request body
//  and registers the "shop/update" webhook using the Shopify Webhooks API.

router.post("/webhooks/register", async (req, res) => {
  try {
    const { shop, accessToken } = req.body;
    const webhookUrl = `${SHOPIFY_APP_URL}/webhooks/callback`;

    // Register the webhook using the Shopify Webhooks API
    const response = await axios.post(
      `https://${shop}/admin/api/2021-07/webhooks.json`,
      {
        webhook: {
          topic: "shop/update",
          address: webhookUrl,
          format: "json",
        },
      },
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    if (response.status === 201) {
      res.status(200).json({ message: "Webhook registered successfully" });
    } else {
      res.status(500).json({ error: "Failed to register webhook" });
    }
  } catch (error) {
    console.error("Error registering webhook:", error);
    res.status(500).json({ error: "Server error" });
  }
});

//   Handle the webhook callback

router.post("/webhooks/callback", async (req, res) => {
  const { topic, body } = req.body;

  // Handle the webhook based on the topic
  if (topic === "shop/update") {
    try {
      // Retrieve the shop data from the request body
      const { shopId, shopName, shopEmail } = body;

      // Update the shop data in the MongoDB backend
      const updatedShop = await Shop.findOneAndUpdate(
        { shopId: shopId },
        { shopName: shopName, shopEmail: shopEmail },
        { new: true }
      );

      // Handle any other necessary actions based on the updated shop data

      // Send a response indicating the webhook was processed successfully
      res.status(200).send("Webhook processed successfully");
    } catch (error) {
      console.error("Error updating shop data:", error);
      res.sendStatus(500);
    }
  } else {
    // Ignore other webhook topics
    res.sendStatus(200);
  }
});


///Register the webhook:




  









module.exports = router;
