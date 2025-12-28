require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const admin = require('firebase-admin')
const port = process.env.PORT || 3000
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, 'base64').toString(
  'utf-8'
)
const serviceAccount = JSON.parse(decoded)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const app = express()
// middleware
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
     
    ],
    credentials: true,
    optionSuccessStatus: 200,
  })
)
app.use(express.json())

// jwt middlewares
const verifyJWT = async (req, res, next) => {
  const token = req?.headers?.authorization?.split(' ')[1]
  console.log(token)
  if (!token) return res.status(401).send({ message: 'Unauthorized Access!' })
  try {
    const decoded = await admin.auth().verifyIdToken(token)
    req.tokenEmail = decoded.email
    console.log(decoded)
    next()
  } catch (err) {
    console.log(err)
    return res.status(401).send({ message: 'Unauthorized Access!', err })
  }
}

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})
async function run() {
  try {

    const database = client.db('BookMyTrip')
    const ticketsCollection = database.collection('tickets')


//ticket post api
app.post('/tickets', async(req,res)=> {
    const ticket = req.body;
    const result = await ticketsCollection.insertOne(ticket);
    res.send(result);
})

//all tickets get api
app.get('/tickets', async(req,res)=>{
    const result = await ticketsCollection.find({isVisible: true}).toArray();
    res.send(result);
})

//requested ticket get api
app.get('/my-tickets/:email', async(req,res)=>{
    const email = req.params.email;
    const result = await ticketsCollection.find({'vendor.email': email}).toArray();
    res.send(result);
})

//update ticket status api
app.patch('/tickets/approve/:id', async(req,res)=>{
  const id = req.params.id;
  const filter = {_id: new ObjectId(id)};
  const updateStatus = {
    $set: {
      status: 'approved'
    },
  };
  const result = await ticketsCollection.updateOne(filter, updateStatus);
  res.send(result);
})

app.patch('/tickets/reject/:id', async(req,res)=>{
  const id = req.params.id;
  const filter = {_id: new ObjectId(id)};
  const updateStatus = {
    $set: {
      status: 'rejected'
    }
  }
  const result = await ticketsCollection.updateOne(filter, updateStatus);
  res.send(result);
})

//get all approved tickets api
app.get('/approved-tickets', async(req,res)=>{
 const result = await ticketsCollection.find({status: 'approved'}).toArray();
 res.send(result);
})

//get single ticket api
app.get('/tickets/:id', async(req,res)=>{
  const id = req.params.id;
  const filter = {_id: new ObjectId(id)};
  const result = await ticketsCollection.findOne(filter);
  res.send(result);
})

// Advertise ticket API (safe & optimized)
app.patch('/advertise-tickets/:id', async (req, res) => {
  const { id } = req.params;
  const { isAdvertised } = req.body;

  if (typeof isAdvertised !== 'boolean') {
    return res.status(400).send({ message: 'Invalid advertise value' });
  }

  // Limit only when trying to advertise
  if (isAdvertised === true) {
    const advertisedCount = await ticketsCollection.countDocuments({
      isAdvertised: true
    });

    if (advertisedCount >= 6) {
      return res.status(400).send({
        message: 'Maximum 6 tickets can be advertised at a time.'
      });
    }
  }

  const result = await ticketsCollection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { isAdvertised } }
  );

  res.send(result);
});












    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello from Server..')
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})