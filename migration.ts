// import { apiHandler } from '@/lib/api'
// import connectToDatabase from '@/services/mongodb/main-db-connection'
// import connectToPreviousDatabase from '@/services/mongodb/previous/connection'
// import { NextApiHandler } from 'next'

// const handleMigration: NextApiHandler<any> = async (req, res) => {
//   const newDb = await connectToDatabase()
//   const newClientsCollection = newDb.collection('clients')
//   const newGoalsCollection = newDb.collection('goals')
//   const newMarketingControlsCollection = newDb.collection('marketing-controls')
//   const newSalesCollection = newDb.collection('sales')
//   const newSessionsCollection = newDb.collection('sessions')
//   const newUsersCollection = newDb.collection('users')
//   const newUtilsCollection = newDb.collection('utils')

//   const previousDb = await connectToPreviousDatabase()

//   const previousClientsCollection = previousDb.collection('clients')
//   const previousGoalsCollection = previousDb.collection('goals')
//   const previousMarketingControlsCollection = previousDb.collection('marketing-controls')
//   const previousSalesCollection = previousDb.collection('sales')
//   const previousSessionsCollection = previousDb.collection('sessions')
//   const previousUsersCollection = previousDb.collection('users')
//   const previousUtilsCollection = previousDb.collection('utils')

//   // CLIENTS
//   const previousClients = await previousClientsCollection.find({}).toArray()
//   console.log('previousClients', previousClients.length)
//   const insertClientsResponse = await newClientsCollection.insertMany(previousClients)

//   // GOALS
//   const previousGoals = await previousGoalsCollection.find({}).toArray()
//   console.log('previousGoals', previousGoals.length)
//   const insertGoalsResponse = await newGoalsCollection.insertMany(previousGoals)

//   // MARKETING CONTROLS
//   const previousMarketingControls = await previousMarketingControlsCollection.find({}).toArray()
//   console.log('previousMarketingControls', previousMarketingControls.length)
//   const insertMarketingControlsResponse = await newMarketingControlsCollection.insertMany(previousMarketingControls)

//   // SALES
//   const previousSales = await previousSalesCollection.find({}).toArray()
//   console.log('previousSales', previousSales.length)
//   const insertSalesResponse = await newSalesCollection.insertMany(previousSales)

//   // SESSIONS
//   const previousSessions = await previousSessionsCollection.find({}).toArray()
//   console.log('previousSessions', previousSessions.length)
//   const insertSessionsResponse = await newSessionsCollection.insertMany(previousSessions)

//   // USERS
//   const previousUsers = await previousUsersCollection.find({}).toArray()
//   console.log('previousUsers', previousUsers.length)
//   const insertUsersResponse = await newUsersCollection.insertMany(previousUsers)

//   // UTILS
//   const previousUtils = await previousUtilsCollection.find({}).toArray()
//   console.log('previousUtils', previousUtils.length)
//   const insertUtilsResponse = await newUtilsCollection.insertMany(previousUtils)
//   return res.status(200).json({
//     insertClientsResponse,
//     insertGoalsResponse,
//     insertMarketingControlsResponse,
//     insertSalesResponse,
//     insertSessionsResponse,
//     insertUsersResponse,
//     insertUtilsResponse,
//   })
//   //   return res.status(200).json({
//   //     message: 'Migration completed successfully',
//   //   })
// }

// export default apiHandler({
//   GET: handleMigration,
// })
