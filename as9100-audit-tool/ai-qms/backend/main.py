from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from typing import List, Optional
import os
from dotenv import load_dotenv
import uvicorn
from pydantic import BaseModel
from openai import OpenAI
import json

# Load environment variables
load_dotenv()

app = FastAPI(
    title="AS9100 AI Audit Tool",
    description="AI-powered tool for reviewing documentation against AS9100 standards",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Configure OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class DocumentSection(BaseModel):
    level: int
    heading: str
    text: str

class AuditRequest(BaseModel):
    clause: str
    document: List[DocumentSection]

class AuditResponse(BaseModel):
    clause: str
    sectionsAudited: List[dict]
    overallConclusion: str
    findings: List[dict] = []  # List of detailed findings
    recommendations: List[str] = []  # List of specific recommendations
    riskAssessment: str = ""  # Overall risk assessment
    complianceStatus: str = ""  # Overall compliance status

# Basic health check endpoint
@app.get("/")
async def root():
    return {"status": "healthy", "message": "AS9100 AI Audit Tool API is running"}

# Document upload endpoint
@app.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    clauses: List[str] = None,
    context: Optional[str] = None,
    token: str = Depends(oauth2_scheme)
):
    """
    Upload a document for AS9100 compliance review.
    
    Args:
        file: The document file to be reviewed
        clauses: List of AS9100 clauses to check against
        context: Additional context or instructions for the review
        token: Authentication token
    
    Returns:
        Upload confirmation and document ID
    """
    try:
        # TODO: Implement file validation and storage
        # TODO: Implement document processing queue
        return {
            "message": "Document uploaded successfully",
            "filename": file.filename,
            "clauses": clauses,
            "context": context
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Document review endpoint
@app.get("/review/{document_id}")
async def get_review(
    document_id: str,
    token: str = Depends(oauth2_scheme)
):
    """
    Get the review results for a specific document.
    
    Args:
        document_id: The ID of the document to review
        token: Authentication token
    
    Returns:
        Review results including compliance status and recommendations
    """
    try:
        # TODO: Implement document review retrieval
        return {
            "document_id": document_id,
            "status": "pending",
            "message": "Review in progress"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/audit", response_model=AuditResponse)
async def audit_document(request: AuditRequest):
    try:
        print(f"Received audit request for clause: {request.clause}")
        print(f"Document sections: {request.document}")

        system_prompt = """You are QA-GPT, a specialist in AS9100 documentation audits. 
When given:
  • An AS9100 clause (e.g. "8.5.1 Control of Production and Service Provision")  
  • A document excerpt (structured into headings/sections, down to 3 levels)  

You must:
- review ONLY the document content (ignore any descriptions or metadata)
- identify all issues of non-compliance against the flagged AS9100 clause
- create an itemised list of these issues and potential recommendations to address the problem

For each non-compliance issue found:
1. Clearly state the specific requirement from the AS9100 clause that is not met
2. Provide the exact evidence from the document content that shows the non-compliance
3. Explain the potential impact or risk of this non-compliance
4. Suggest specific recommendations to address the issue

IMPORTANT: 
- Focus ONLY on the actual document content, not descriptions or metadata
- Your response MUST be a valid JSON object with the following structure:
{
    "sectionsAudited": [
        {
            "title": "Section Title",
            "description": "Detailed description of findings",
            "evidence": "Supporting evidence from the document",
            "impact": "Impact of the finding"
        }
    ],
    "overallConclusion": "Overall conclusion of the audit",
    "findings": [
        {
            "title": "Finding Title",
            "description": "Detailed description",
            "evidence": "Supporting evidence",
            "impact": "Impact assessment"
        }
    ],
    "recommendations": [
        "Specific recommendation 1",
        "Specific recommendation 2"
    ],
    "riskAssessment": "Overall risk assessment",
    "complianceStatus": "Compliant/Non-Compliant/Partially Compliant"
}

DO NOT include any text before or after the JSON object. The response must be valid JSON."""

        user_prompt = f"""Please perform a detailed audit of the following document against AS9100 Clause {request.clause}.

Document Content:
{request.document}

Provide a comprehensive audit report in the specified JSON format."""

        print("Sending request to OpenAI...")
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7
        )

        print("Received response from OpenAI")
        response_content = response.choices[0].message.content
        print(f"Response content: {response_content}")

        try:
            # Clean the response content to ensure it's valid JSON
            # Remove any text before the first { and after the last }
            json_start = response_content.find('{')
            json_end = response_content.rfind('}') + 1
            if json_start == -1 or json_end == 0:
                raise ValueError("No JSON object found in response")
            
            cleaned_content = response_content[json_start:json_end]
            result = json.loads(cleaned_content)
            
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON response: {e}")
            print(f"Response content: {response_content}")
            raise HTTPException(
                status_code=500,
                detail=f"Error parsing AI response: {str(e)}"
            )

        required_fields = ["sectionsAudited", "overallConclusion", "findings", "recommendations", "riskAssessment", "complianceStatus"]
        for field in required_fields:
            if field not in result:
                result[field] = [] if field in ["findings", "recommendations"] else ""

        return AuditResponse(
            clause=request.clause,
            sectionsAudited=result.get("sectionsAudited", []),
            overallConclusion=result.get("overallConclusion", ""),
            findings=result.get("findings", []),
            recommendations=result.get("recommendations", []),
            riskAssessment=result.get("riskAssessment", ""),
            complianceStatus=result.get("complianceStatus", "")
        )

    except Exception as e:
        print(f"Error in audit_document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/clauses/{clause_id}")
async def get_clause_details(clause_id: str):
    # This would typically fetch from a database or predefined list
    # For now, we'll return a mock response
    return {
        "id": clause_id,
        "title": f"AS9100 Clause {clause_id}",
        "description": "Detailed description of the clause requirements"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True) 