# AS9100 AI Audit Tool

An AI-powered tool designed to review documentation against AS9100 standards, providing precise feedback on compliance issues and suggesting corrective actions.

## Features

- Document upload and analysis against AS9100 standards
- AI-driven compliance review
- Detailed non-conformity reports
- Corrective action recommendations
- Subscription and pay-per-document payment models
- Document correction services

## Project Structure

```
.
├── backend/           # FastAPI backend service
├── frontend/         # React frontend application
├── tests/            # Test suite
├── scripts/          # Utility scripts
└── docs/            # Documentation
```

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 16+
- PostgreSQL
- OpenAI API key

### Backend Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. Create a `.env` file based on `.env.example` and configure your environment variables.

4. Run the backend server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

## API Documentation

Once the backend server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Testing

Run the test suite:
```bash
cd backend
pytest
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact [support@as9100audit.com](mailto:support@as9100audit.com)
