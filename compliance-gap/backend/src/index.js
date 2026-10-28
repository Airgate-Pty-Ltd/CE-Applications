import express from 'express'
import cors from 'cors'
import axios from 'axios'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000
const VERA_URL = process.env.VERA_SERVICE_URL || 'http://localhost:3001'

app.use(cors())
app.use(express.json({ limit: '50mb' }))

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../frontend/dist')))

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'compliancegap',
    veraUrl: VERA_URL
  })
})

// Gap analysis endpoint
app.post('/api/gap-analysis', async (req, res) => {
  try {
    const { standard, requirements, procedures, userId } = req.body

    // Call VERA-Core
    const response = await axios.post(`${VERA_URL}/api/vera/gap-analysis/analyze`, {
      standard,
      standardRequirements: Array.isArray(requirements) ? requirements : requirements.split('\n').filter(r => r.trim()),
      customerProcedures: Array.isArray(procedures) ? procedures : procedures.split('\n').filter(p => p.trim()),
      userId: userId || 'demo-user'
    }, {
      timeout: 60000
    })

    res.json(response.data)
  } catch (error) {
    console.error('Error calling VERA:', error.message)
    console.error('Error details:', error.response?.data)
    res.status(500).json({
      error: error.response?.data?.error || error.message,
      details: error.response?.data
    })
  }
})

// Fallback route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'))
})

app.listen(PORT, () => {
  console.log(`✅ ComplianceGap backend running on port ${PORT}`)
  console.log(`📡 Connected to VERA at ${VERA_URL}`)
})

