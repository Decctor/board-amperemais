import { apiHandler } from '@/lib/api'
import { TProduct } from '@/schemas/products'
import connectToDatabase from '@/services/mongodb/main-db-connection'
import { NextApiHandler } from 'next'

const handleExportCatalogRoute: NextApiHandler<any> = async (req, res) => {
  const db = await connectToDatabase()
  const productsCollection = db.collection<TProduct>('products')

  const products = await productsCollection.find({}).toArray()

  return res.status(200).json(products)
}

export default apiHandler({ GET: handleExportCatalogRoute })
