const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const app = express();
require("dotenv").config();
// const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// JWT verification
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

// mongodb connection
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qbyf5is.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client.db("musicUser").collection("users");
    const classCollection = client.db("musicUser").collection("classes");
    const allClassCollection = client.db("musicUser").collection("allclass");
    const selectedClassCollection = client.db("musicUser").collection("selectedclass");

    // jwt token
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res.send({ token });
    });

    // create user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already existed" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // verifyJWT, verifyAdmin,
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // make admin
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // get admin by mail and admin role
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    // make instructor
    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // get instructor by mail and admin role
    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instructor: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });

    // class related API
    app.get("/classes", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    // all Instructors related API
    app.get("/instructors", async (req, res) => {
      const query = { role : "instructor" };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });

    // get user's role
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { role: user?.role };
      res.send(result);
    });

    // add a class: verifyAdmin
    app.post("/all-class", verifyJWT, async (req, res) => {
      const newItem = req.body;
      const result = await allClassCollection.insertOne(newItem);
      res.send(result);
    });

    // get all classes
    app.get("/all-class", async (req, res) => {
      const result = await allClassCollection.find().toArray();
      res.send(result);
    });

    // get all the classes added by an instructor
    app.get("/all-class/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const result = await allClassCollection.find(query).toArray();
      res.send(result);
    });

    // selected class related API
    app.post("/selected-class", verifyJWT, async (req, res) => {
      const newItem = req.body;
      const result = await selectedClassCollection.insertOne(newItem);
      res.send(result);
    });

    app.get("/selected-class/:email", async (req, res) => {
      const email = req.params.email;

      const query = { userEmail: email };
      const result = await selectedClassCollection.find(query).toArray();
      res.send(result);
    });

    // delete selected class
    app.delete("/selected-class/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassCollection.deleteOne(query);
      res.send(result);
    });









    // end of the database
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// running server
app.get("/", (req, res) => {
  res.send("SchoolOfMusic is running");
});

app.listen(port, () => {
  console.log(`SchoolOfMusic is running on the port ${port}`);
});
